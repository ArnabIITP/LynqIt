export default function PollEventBubble({ message, onVote, onRsvp, authUser }) {
  // POLL
  if (message.mediaType === "poll" && message.poll) {
    const poll = message.poll;
    // votes are stored in each option.votes (array of userIds) + poll.voted summary
    const userVotes = (poll.voted || []).filter(v => (v.user?.toString?.() === authUser._id) || v.user === authUser._id);
    const selectedIndexes = userVotes.map(v => v.optionIndex);
    const totalVotes = poll.options.reduce((sum, o) => sum + (o.votes?.length || 0), 0);

    const toggleSelect = (idx) => {
      if (poll.allowsMultipleAnswers) {
        let next;
        if (selectedIndexes.includes(idx)) {
          next = selectedIndexes.filter(i => i !== idx);
        } else {
          next = [...selectedIndexes, idx];
        }
        onVote(next);
      } else {
        onVote(idx);
      }
    };

    return (
      <div className="text-sm max-w-[360px] space-y-2">
        <div className="font-semibold">{poll.question}</div>
        <div className="space-y-2">
          {poll.options.map((opt, idx) => {
            const voteCount = (opt.votes || []).length;
            const percent = totalVotes ? Math.round((voteCount / totalVotes) * 100) : 0;
            const active = selectedIndexes.includes(idx);
            return (
              <div
                key={idx}
                className={`border rounded-md p-2 cursor-pointer transition-colors ${active ? 'border-primary bg-primary/10' : 'border-base-300 hover:bg-base-200'}`}
                onClick={() => toggleSelect(idx)}
              >
                <div className="flex items-center gap-2">
                  <div className={`h-4 w-4 rounded-sm flex items-center justify-center text-[10px] font-bold border ${active ? 'bg-primary text-primary-content border-primary' : 'border-base-400'}`}>{active ? '✓' : ''}</div>
                  <span className="flex-1 leading-tight">{opt.option || opt}</span>
                  <span className="text-[11px] opacity-70 w-10 text-right">{voteCount}</span>
                </div>
                <div className="mt-1 h-1.5 bg-base-300 rounded overflow-hidden">
                  <div className="h-full bg-primary/60" style={{ width: percent + '%' }}></div>
                </div>
                <div className="text-[10px] opacity-50 mt-0.5 flex justify-between">
                  <span>{percent}%</span>
                  {active && <span className="text-primary/80">Selected</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-[11px] opacity-60">
          {poll.allowsMultipleAnswers ? 'Tap to toggle multiple options (updates immediately)' : 'Tap to change your vote'}
        </div>
        {totalVotes > 0 && (
          <div className="text-[11px] opacity-60">Total votes: {totalVotes}</div>
        )}
      </div>
    );
  }

  // EVENT
  if (message.mediaType === "event" && message.event) {
    const event = message.event;
  const userRsvp = (event.rsvps || []).find(r => (r.user?.toString?.() === authUser._id) || r.user === authUser._id);
  const hasRsvped = !!userRsvp; // but user can change
    const yesCount = (event.rsvps || []).filter(r => r.status === 'yes').length;
    const maybeCount = (event.rsvps || []).filter(r => r.status === 'maybe').length;
    const noCount = (event.rsvps || []).filter(r => r.status === 'no').length;
    return (
      <div className="p-3 bg-base-200 rounded-lg min-w-[240px] max-w-[320px]">
        <div className="font-semibold mb-1 flex items-center gap-2">
          <span>{event.title}</span>
        </div>
        <div className="text-[11px] mb-2 opacity-70">
          {event.eventDate && new Date(event.eventDate).toLocaleString()} {event.location && <>• {event.location}</>}
        </div>
        {event.description && <div className="mb-2 text-xs whitespace-pre-line">{event.description}</div>}
        <div className="flex gap-2 mt-1">
          <button className={`btn btn-xs ${userRsvp?.status === 'yes' ? 'btn-success' : 'btn-outline'}`} onClick={() => onRsvp('yes')}>Going ({yesCount})</button>
          <button className={`btn btn-xs ${userRsvp?.status === 'maybe' ? 'btn-warning' : 'btn-outline'}`} onClick={() => onRsvp('maybe')}>Maybe ({maybeCount})</button>
          <button className={`btn btn-xs ${userRsvp?.status === 'no' ? 'btn-error' : 'btn-outline'}`} onClick={() => onRsvp('no')}>No ({noCount})</button>
        </div>
        <div className="text-[11px] opacity-60 mt-2">{hasRsvped ? <>You responded: <b>{userRsvp.status}</b> (tap to change)</> : 'Tap a response'}</div>
      </div>
    );
  }
  return null;
}
