import Message from '../models/message.model.js';
import Group from '../models/group.model.js';
import { io } from '../lib/socket.js';

// Create a poll in a group chat
export const createPoll = async (req, res) => {
	try {
		const { groupId, question, options, isAnonymous = false, allowsMultipleAnswers = false } = req.body;
		if (!groupId || !question || !Array.isArray(options) || options.length < 2) {
			return res.status(400).json({ error: 'Invalid poll data' });
		}
		const pollOptions = options.map(option => ({ option, votes: [] }));
		const pollMessage = await Message.create({
			senderId: req.user._id,
			groupId,
			messageType: 'group',
			mediaType: 'poll',
			poll: {
				question,
				options: pollOptions,
				isAnonymous,
				allowsMultipleAnswers,
				voted: []
			}
		});

		// Populate sender for UI consistency
		await pollMessage.populate('senderId', 'fullName username profilePic');

		// Emit as a normal group message to all group members (real-time delivery + unread counts)
		try {
			const group = await Group.findById(groupId);
			if (group) {
				for (const member of group.members) {
					const memberId = member.user.toString();
					const socketId = global.userSocketMap[memberId];
					if (socketId) {
						io.to(socketId).emit('newGroupMessage', { message: pollMessage, groupId });
					}
					// Increment unread count for members other than sender
					if (memberId !== req.user._id.toString()) {
						try {
							const { incrementUnreadCount } = await import('./unreadCounter.controller.js');
							await incrementUnreadCount(memberId, 'group', groupId, pollMessage._id);
						} catch (e) {
							console.error('[createPoll] unread increment error', e);
						}
					}
				}
			}
		} catch (socketErr) {
			console.error('[createPoll] socket emit error:', socketErr);
		}

		res.status(201).json(pollMessage);
	} catch (err) {
		console.error('[createPoll] error:', err);
		res.status(500).json({ error: err.message });
	}
};

// Vote on a poll
export const votePoll = async (req, res) => {
	try {
		const { messageId } = req.params;
		let { optionIndexes, optionIndex } = req.body; // support both payload styles
		if (!optionIndexes && (optionIndex === 0 || optionIndex)) optionIndexes = [optionIndex];
		const userId = req.user._id;
		const pollMsg = await Message.findById(messageId);
		if (!pollMsg || pollMsg.mediaType !== 'poll') return res.status(404).json({ error: 'Poll not found' });
		if (!Array.isArray(optionIndexes) || optionIndexes.length === 0) return res.status(400).json({ error: 'No option selected' });
		// Enforce single answer if poll does not allow multiple
		if (!pollMsg.poll.allowsMultipleAnswers && optionIndexes.length > 1) {
			return res.status(400).json({ error: 'Multiple answers not allowed for this poll' });
		}
		// Validate option indexes
		const maxIndex = pollMsg.poll.options.length - 1;
		for (const idx of optionIndexes) {
			if (typeof idx !== 'number' || idx < 0 || idx > maxIndex) {
				return res.status(400).json({ error: `Invalid option index: ${idx}` });
			}
		}
		// Ensure voted array exists
		if (!Array.isArray(pollMsg.poll.voted)) pollMsg.poll.voted = [];
		// Remove previous votes by this user
		pollMsg.poll.options.forEach(opt => {
			opt.votes = opt.votes.filter(v => v.toString() !== userId.toString());
		});
		// Add new votes
		optionIndexes.forEach(idx => {
			if (pollMsg.poll.options[idx]) pollMsg.poll.options[idx].votes.push(userId);
		});
		// Track who voted for what
		pollMsg.poll.voted = pollMsg.poll.voted.filter(v => v.user.toString() !== userId.toString());
		optionIndexes.forEach(idx => {
			pollMsg.poll.voted.push({ user: userId, optionIndex: idx });
		});
		await pollMsg.save();

		// Emit update to group participants
		try {
			if (pollMsg.groupId) {
				await pollMsg.populate('senderId', 'fullName username profilePic');
				const group = await Group.findById(pollMsg.groupId);
				if (group) {
					group.members.forEach(member => {
						const socketId = global.userSocketMap[member.user.toString()];
						if (socketId) io.to(socketId).emit('groupMessageUpdated', pollMsg);
					});
				}
			}
		} catch (e) {
			console.error('[votePoll] socket emit error:', e);
		}

		res.json(pollMsg);
	} catch (err) {
		console.error('[votePoll] error:', err);
		res.status(500).json({ error: err.message });
	}
};

// Create an event in a group chat
export const createEvent = async (req, res) => {
	try {
		const { groupId, title, description, eventDate, location } = req.body;
		if (!groupId || !title || !eventDate) {
			return res.status(400).json({ error: 'Invalid event data' });
		}
		const eventMessage = await Message.create({
			senderId: req.user._id,
			groupId,
			messageType: 'group',
			mediaType: 'event',
			event: {
				title,
				description,
				eventDate,
				location,
				attendees: [],
				rsvps: []
			}
		});

		await eventMessage.populate('senderId', 'fullName username profilePic');

		try {
			const group = await Group.findById(groupId);
			if (group) {
				for (const member of group.members) {
					const memberId = member.user.toString();
					const socketId = global.userSocketMap[memberId];
					if (socketId) io.to(socketId).emit('newGroupMessage', { message: eventMessage, groupId });
					if (memberId !== req.user._id.toString()) {
						try {
							const { incrementUnreadCount } = await import('./unreadCounter.controller.js');
							await incrementUnreadCount(memberId, 'group', groupId, eventMessage._id);
						} catch (e) {
							console.error('[createEvent] unread increment error', e);
						}
					}
				}
			}
		} catch (socketErr) {
			console.error('[createEvent] socket emit error:', socketErr);
		}

		res.status(201).json(eventMessage);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

// RSVP to an event
export const rsvpEvent = async (req, res) => {
	try {
		const { messageId } = req.params;
		const { status } = req.body; // 'yes', 'no', 'maybe'
		const userId = req.user._id;
		const eventMsg = await Message.findById(messageId);
		if (!eventMsg || eventMsg.mediaType !== 'event') return res.status(404).json({ error: 'Event not found' });
		if (!['yes','no','maybe'].includes(status)) return res.status(400).json({ error: 'Invalid RSVP status' });
		// Remove previous RSVP
		eventMsg.event.rsvps = eventMsg.event.rsvps.filter(r => r.user.toString() !== userId.toString());
		eventMsg.event.rsvps.push({ user: userId, status });
		// Update attendees list
		eventMsg.event.attendees = eventMsg.event.rsvps.filter(r => r.status === 'yes').map(r => r.user);
		await eventMsg.save();

		try {
			if (eventMsg.groupId) {
				await eventMsg.populate('senderId', 'fullName username profilePic');
				const group = await Group.findById(eventMsg.groupId);
				if (group) {
					group.members.forEach(member => {
						const socketId = global.userSocketMap[member.user.toString()];
						if (socketId) io.to(socketId).emit('groupMessageUpdated', eventMsg);
					});
				}
			}
		} catch (e) {
			console.error('[rsvpEvent] socket emit error:', e);
		}

		res.json(eventMsg);
	} catch (err) {
		console.error('[rsvpEvent] error:', err);
		res.status(500).json({ error: err.message });
	}
};
