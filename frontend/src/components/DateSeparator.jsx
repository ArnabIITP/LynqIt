import React from 'react';

const DateSeparator = ({ date }) => {
  if (!date) return null;

  return (
    <div className="flex items-center justify-center my-3">
      <span className="px-3 py-1 rounded-full bg-light-gray text-medium-gray font-medium text-xs">
        {date}
      </span>
    </div>
  );
};

export default DateSeparator;
