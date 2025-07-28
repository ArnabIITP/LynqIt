import { Check, CheckCheck, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';

const MessageStatusIndicator = ({ message, isOwnMessage }) => {
  const { resendMessage } = useChatStore();

  // Only show status for own messages
  if (!isOwnMessage) return null;
  
  // Determine the appropriate text color based on message ownership
  const textColorClass = isOwnMessage ? 'text-primary-content' : 'text-base-content';

  const handleResendMessage = () => {
    resendMessage(message._id);
  };

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
      case 'pending':
        return <Clock size={14} className={`${textColorClass}/70`} />;

      case 'sent':
        return <Check size={14} className={`${textColorClass}/80`} />;

      case 'delivered':
        return <CheckCheck size={14} className={`${textColorClass}/80`} />;

      case 'seen':
        return <CheckCheck size={14} className={`${textColorClass} font-bold`} />;

      case 'failed':
        return (
          <div className="flex items-center gap-1">
            <AlertCircle size={14} className="text-error" />
            <button
              className="btn btn-xs btn-ghost text-error"
              onClick={handleResendMessage}
            >
              <RefreshCw size={12} />
              Retry
            </button>
          </div>
        );

      default:
        return <Clock size={14} className="text-base-content/50" />;
    }
  };

  const getStatusText = () => {
    switch (message.status) {
      case 'sending':
      case 'pending':
        return 'Sending...';

      case 'sent':
        return 'Sent';

      case 'delivered':
        return 'Delivered';

      case 'seen':
        return 'Seen';

      case 'failed':
        return 'Failed';

      default:
        return 'Sending...';
    }
  };

  // Special handling for failed messages
  if (message.status === 'failed') {
    return (
      <div className="flex items-center gap-1 text-xs text-error mt-1">
        <AlertCircle size={12} className="text-error" />
        <span className="text-error">Failed</span>
        <button
          className={`btn btn-xs btn-ghost text-error hover:bg-error/10`}
          onClick={handleResendMessage}
        >
          <RefreshCw size={12} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-xs mt-1">
      {getStatusIcon()}
      <span className={`${textColorClass}/80`}>{getStatusText()}</span>
      {message.status === 'seen' && message.seenAt && (
        <span className={`${textColorClass}/70 ml-1`}>
          {new Date(message.seenAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      )}
    </div>
  );
};

export default MessageStatusIndicator;
