import React from 'react';

const EMOJI_REGEX = /^(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83d\ude00-\ude4f]|[\ud83d\ude80-\udfef]|[\ud83e\udd00-\udfff])+$/;

function LogoDisplay({ logo, name, size = 50 }) {
  const isEmoji = (str) => {
    return str && EMOJI_REGEX.test(str.trim());
  };

  const getInitials = (str) => {
    if (!str) return 'N/A';
    const words = str.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return str.substring(0, 2).toUpperCase();
  };

  const style = {
    width: size,
    height: size,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#374151',
    color: 'white',
    fontSize: size * 0.4,
    fontWeight: 'bold',
    flexShrink: 0,
    overflow: 'hidden'
  };

  if (logo) {
    if (isEmoji(logo)) {
      return <div style={style}>{logo.trim()}</div>;
    }
    return (
      <img 
        src={logo.startsWith('/uploads') ? `${import.meta.env.VITE_BACKEND_URL || ''}${logo}` : logo} 
        alt={name} 
        style={{ ...style, objectFit: 'cover' }} 
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    );
  }

  return <div style={style}>{getInitials(name)}</div>;
}

export default LogoDisplay;
