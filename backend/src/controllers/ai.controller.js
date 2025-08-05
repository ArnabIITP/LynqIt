import fetch from "node-fetch";
import dotenv from "dotenv";
import AIConversation from "../models/ai.model.js";
import { uploadToCloudinary } from "../lib/cloudinary.js";
import { retryFetch } from "../lib/retryFetch.js";
import fs from "fs";

dotenv.config();

/**
 * Process an AI query and return a response
 */
export const processAIQuery = async (req, res) => {
  try {
    const { text, conversationId } = req.body;
    const userId = req.user._id;
    let attachments = [];
    
    // Handle file uploads if present
    if (req.files && req.files.length > 0) {
      // Process up to 8 attachments
      const filesToProcess = req.files.slice(0, 8);
      console.log(`Processing ${filesToProcess.length} files:`, filesToProcess.map(f => f.originalname));
      
      for (const file of filesToProcess) {
        try {
          console.log(`Processing file: ${file.originalname}, Path: ${file.path}`);
          
          // Check if file exists
          if (!fs.existsSync(file.path)) {
            console.error(`File does not exist at path: ${file.path}`);
            continue;
          }
          
          // Upload file to Cloudinary
          const result = await uploadToCloudinary(file.path);
          
          // Determine file type from MIME type
          const fileType = file.mimetype.split('/')[0];
          
          // Add to attachments array with proper metadata
          attachments.push({
            url: result.secure_url,
            fileType: fileType,
            fileName: file.originalname,
            mimeType: file.mimetype
          });
          
          console.log(`Successfully uploaded ${fileType} file: ${file.originalname} to ${result.secure_url}`);
        } catch (uploadError) {
          console.error(`Failed to upload file ${file.originalname}:`, uploadError);
        } finally {
          // Delete temp file regardless of success/failure
          try {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
              console.log(`Deleted temp file: ${file.path}`);
            }
          } catch (err) {
            console.error(`Failed to delete temp file ${file.path}:`, err);
          }
        }
      }
    }

    // Initialize conversation or get existing one
    let conversation;
    if (conversationId) {
      conversation = await AIConversation.findOne({ 
        _id: conversationId,
        user: userId
      });
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
    } else {
      conversation = new AIConversation({
        user: userId,
        messages: []
      });
    }
    
    // Add user message to conversation
    const userMessage = {
      role: "user",
      content: text,
      attachments: attachments,
      timestamp: new Date()
    };
    conversation.messages.push(userMessage);
    conversation.lastUpdated = new Date();
    await conversation.save();

    // Prepare the OpenRouter API request
    const messages = prepareMessages(conversation.messages);
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: "AI service configuration error" });
    }
    
    // Web search functionality has been removed
    
    // Add system message to establish the assistant's persona
    messages.unshift({
      role: "system",
      content: "You are a helpful and friendly assistant. Respond accurately and concisely to user queries."
    });
    
    console.log("Sending to OpenRouter:", JSON.stringify({
      model: "meta-llama/llama-3.2-11b-vision-instruct:free",
      messages: messages,
      temperature: 0.7,
      max_tokens: 2048
    }, null, 2));
    
    // Store a temporary "processing" message to let the user know we're working
    const processingMessage = {
      role: "assistant",
      content: "Processing your request...",
      isProcessing: true,  // Flag to identify this as a temporary message
      timestamp: new Date()
    };
    conversation.messages.push(processingMessage);
    await conversation.save();
    
    // Use the retry fetch utility to handle rate limits and retries
    let responseData;
    let response;
    
    try {
      const fetchResult = await retryFetch(
        // The fetch function to retry
        async () => {
          return fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'HTTP-Referer': process.env.PRODUCTION_URL || 'http://localhost:5001',
              'X-Title': 'LynqIt Chat Assistant'
            },
            body: JSON.stringify({
              model: "meta-llama/llama-3.2-11b-vision-instruct:free",
              messages: messages,
              temperature: 0.7,
              max_tokens: 2048
            })
          });
        },
        // Options for retrying
        {
          maxRetries: 10,
          initialDelay: 2000,
          maxDelay: 45000,
          shouldRetry: (err, resp, data) => {
            // Always retry on network errors
            if (err) return true;
            
            // Always retry on rate limit errors (429)
            if (resp && resp.status === 429) return true;
            
            // Check for rate limit messages in error response
            const errorMessage = data?.error?.message || data?.error?.raw || '';
            if (errorMessage.toLowerCase().includes('rate limit') || 
                errorMessage.toLowerCase().includes('rate-limit') ||
                errorMessage.toLowerCase().includes('temporarily rate-limited')) {
              return true;
            }
            
            // Don't retry other error types
            return false;
          },
          onRetry: (attempt, delay, error) => {
            console.log(`Retry attempt ${attempt} for AI query after ${delay}ms delay. Error: ${error?.message || JSON.stringify(error)}`);
          }
        }
      );
      
      response = fetchResult.response;
      responseData = fetchResult.data;
    } catch (retryError) {
      console.error("All retries failed:", retryError);
      
      // Remove the processing message
      conversation.messages = conversation.messages.filter(msg => !msg.isProcessing);
      
      // Add failure message but don't expose the internal error to the user
      const errorMessage = {
        role: "assistant",
        content: "I apologize, but I'm experiencing technical difficulties right now. Please try again in a few minutes.",
        timestamp: new Date()
      };
      
      conversation.messages.push(errorMessage);
      conversation.lastUpdated = new Date();
      await conversation.save();
      
      return res.status(200).json({
        message: errorMessage.content,
        conversationId: conversation._id,
        temporaryError: true
      });
    }
    
    // Remove the processing message now that we have a response
    conversation.messages = conversation.messages.filter(msg => !msg.isProcessing);
    
    // If we still got an error after all retries
    if (!response.ok) {
      console.error("AI API error after all retries:", responseData);
      
      // Handle specific error cases
      if (responseData.error && responseData.error.code === 404) {
        const errorMessage = "I'm sorry, but I can't process that request at the moment. I'll try to answer based on what I already know.";
        
        // Save error message to conversation
        conversation.messages.push({
          role: "assistant",
          content: errorMessage,
          timestamp: new Date()
        });
        
        conversation.lastUpdated = new Date();
        await conversation.save();
        
        return res.status(200).json({
          message: errorMessage,
          conversationId: conversation._id
        });
      } else {
        // We've already tried multiple times, so let the user know there's a persistent issue
        const errorMessage = "I apologize, but I'm unable to respond to your query right now. The AI service is experiencing issues. Please try again later.";
        
        // Save error message to conversation
        conversation.messages.push({
          role: "assistant",
          content: errorMessage,
          timestamp: new Date()
        });
        
        conversation.lastUpdated = new Date();
        await conversation.save();
        
        return res.status(200).json({
          message: errorMessage,
          conversationId: conversation._id,
          persistentError: true
        });
      }
    }
    
    console.log("OpenRouter response:", JSON.stringify(responseData, null, 2));
    
    // Extract the AI response - handle both string and object content formats
    let aiResponseContent;
    const messageContent = responseData.choices[0].message.content;
    
    if (typeof messageContent === 'string') {
      aiResponseContent = messageContent;
    } else if (Array.isArray(messageContent)) {
      // If content is an array, extract all text parts and join them
      aiResponseContent = messageContent
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');
    } else {
      // Fallback
      aiResponseContent = "I received your message, but had trouble processing the response.";
    }
    
    // Save the AI response to the conversation
    conversation.messages.push({
      role: "assistant",
      content: aiResponseContent,
      timestamp: new Date()
    });
    
    conversation.lastUpdated = new Date();
    await conversation.save();
    
    // Return the response
    return res.status(200).json({
      message: aiResponseContent,
      conversationId: conversation._id
    });
  } catch (error) {
    console.error("Error processing AI query:", error);
    // Return a user-friendly error in the expected format
    return res.status(200).json({ 
      message: "I'm sorry, but there was a problem processing your request. Please try again later.", 
      conversationId: conversation?._id 
    });
  }
};

/**
 * Get conversation history for a user
 */
export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const conversations = await AIConversation.find({ user: userId })
      .sort({ lastUpdated: -1 })
      .select('_id lastUpdated');
      
    return res.status(200).json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return res.status(500).json({ error: "Failed to fetch conversations" });
  }
};

/**
 * Get a specific conversation by ID
 */
export const getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    
    const conversation = await AIConversation.findOne({
      _id: conversationId,
      user: userId
    });
    
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    
    return res.status(200).json(conversation);
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return res.status(500).json({ error: "Failed to fetch conversation" });
  }
};

/**
 * Delete a conversation
 */
export const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    
    const result = await AIConversation.findOneAndDelete({
      _id: conversationId,
      user: userId
    });
    
    if (!result) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    
    return res.status(200).json({ message: "Conversation deleted successfully" });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return res.status(500).json({ error: "Failed to delete conversation" });
  }
};

/**
 * Helper function to prepare messages for the OpenRouter API
 */
function prepareMessages(conversationMessages) {
  return conversationMessages.map(msg => {
    // For messages with no attachments
    if (!msg.attachments || msg.attachments.length === 0) {
      return {
        role: msg.role,
        content: msg.content
      };
    }
    
    // For messages with attachments, use the content array format
    const message = {
      role: msg.role,
      content: []
    };

    // Add the text content first
    if (msg.content && msg.content.trim() !== '') {
      message.content.push({
        type: "text",
        text: msg.content
      });
    }

    // Add attachments
    for (const attachment of msg.attachments) {
      if (attachment.fileType === 'image') {
        message.content.push({
          type: "image_url",
          image_url: {
            url: attachment.url
          }
        });
      } else {
        // For other file types, include a link in the message
        message.content.push({
          type: "text",
          text: `[Attached file: ${attachment.fileName}](${attachment.url})`
        });
      }
    }

    return message;
  });
}
