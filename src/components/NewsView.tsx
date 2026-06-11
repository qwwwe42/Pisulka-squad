import React, { useState, useEffect, useCallback } from 'react';
import { useStreaming, getNewsAverageRating, getOrCreateUserId } from '../context/StreamingContext';
import type { Comment, NewsArticle, ReactionsConfig, EmojiItem } from '../types/streaming';
import { 
  Newspaper, Star, MessageSquare, Send, Calendar, 
  Award, X, CornerDownRight, Plus, Play, Film, ArrowUpDown
} from 'lucide-react';
import { ImageUploader } from './ImageUploader';
import { VideoUploader } from './VideoUploader';
import { getGoogleDriveEmbedUrl } from '../utils/drive';

// YouTube utilities
const getYouTubeEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
};

const getYouTubeThumbnail = (url: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? `https://img.youtube.com/vi/${match[2]}/0.jpg` : null;
};

const renderNewsVideoPlayer = (url: string) => {
  const ytEmbed = getYouTubeEmbedUrl(url);
  const gdEmbed = getGoogleDriveEmbedUrl(url);

  if (ytEmbed) {
    return (
      <div className="relative aspect-[16/9] w-full bg-black border-b border-border-color/60 overflow-hidden">
        <iframe
          src={ytEmbed}
          title="YouTube video player"
          className="w-full h-full border-none"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  if (gdEmbed) {
    return (
      <div className="relative aspect-[16/9] w-full bg-black border-b border-border-color/60 overflow-hidden">
        <iframe
          src={gdEmbed}
          title="Google Drive video player"
          className="w-full h-full border-none"
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }

  // Direct MP4 or other video link
  return (
    <div className="relative aspect-[16/9] w-full bg-black border-b border-border-color/60 overflow-hidden flex items-center justify-center">
      <video
        src={url}
        controls
        className="w-full h-full object-contain"
      />
    </div>
  );
};

// Color gradient generator for user avatars based on nickname hash
const getAvatarGradient = (name: string) => {
  const colors = [
    'from-purple-600 to-indigo-650',
    'from-cyan-600 to-blue-650',
    'from-emerald-600 to-teal-650',
    'from-pink-600 to-rose-650',
    'from-amber-600 to-orange-650',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// Get user initials from name
const getInitials = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.substring(0, 2).toUpperCase();
};

// Format timestamps for comments
const formatCommentDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
};

// Format news dates nicely
const formatNewsDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

interface CommentNode {
  comment: Comment;
  replies: CommentNode[];
}

const buildCommentTree = (comments: Comment[]): CommentNode[] => {
  const commentMap: Record<string, CommentNode> = {};
  const roots: CommentNode[] = [];

  comments.forEach((c) => {
    commentMap[c.id] = { comment: c, replies: [] };
  });

  comments.forEach((c) => {
    const node = commentMap[c.id];
    if (c.parentId && commentMap[c.parentId]) {
      commentMap[c.parentId].replies.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort top-level comments: newest first
  roots.sort((a, b) => new Date(b.comment.createdAt).getTime() - new Date(a.comment.createdAt).getTime());

  // Sort replies recursively: oldest first
  const sortReplies = (node: CommentNode) => {
    node.replies.sort((a, b) => new Date(a.comment.createdAt).getTime() - new Date(b.comment.createdAt).getTime());
    node.replies.forEach(sortReplies);
  };
  roots.forEach(sortReplies);

  return roots;
};

const EMOTICON_FALLBACKS: Record<string, string> = {
  like: '👍',
  heart: '❤️',
  laugh: '😂',
  cry: '😢',
  poop: '💩',
  vomit: '🤮',
  fire: '🔥',
  surprise: '😮'
};

const getEmojiSymbol = (id: string, configList: EmojiItem[]) => {
  const found = configList.find(e => e.id === id);
  if (found) return found.emoji;
  return EMOTICON_FALLBACKS[id] || id;
};

const getEmojiLabel = (id: string, configList: EmojiItem[]) => {
  const found = configList.find(e => e.id === id);
  if (found) return found.label;
  return id;
};

const NewsReactions: React.FC<{
  article: NewsArticle;
  currentUserId: string;
  reactionsConfig: ReactionsConfig;
  toggleNewsReaction: (newsId: string, emojiId: string) => Promise<void>;
}> = ({ article, currentUserId, reactionsConfig, toggleNewsReaction }) => {
  const [particles, setParticles] = useState<{ id: number, emoji: string, clientX: number, clientY: number }[]>([]);

  const handleReactionClick = (e: React.MouseEvent, emojiId: string, emojiSymbol: string) => {
    e.stopPropagation();
    toggleNewsReaction(article.id, emojiId);

    const newParticle = { id: Date.now() + Math.random(), emoji: emojiSymbol, clientX: e.clientX, clientY: e.clientY };
    setParticles(prev => [...prev, newParticle]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== newParticle.id));
    }, 800);
  };

  const enabledEmojis = (reactionsConfig?.emojiList || []).filter(e => e.enabled);
  const articleReactions = article.reactions || {};

  const disabledWithReactions = Object.keys(articleReactions).filter(id => {
    const count = (articleReactions[id] || []).length;
    const isEnabled = enabledEmojis.some(e => e.id === id);
    return count > 0 && !isEnabled;
  });

  const displayList = [
    ...enabledEmojis,
    ...disabledWithReactions.map(id => ({
      id,
      emoji: getEmojiSymbol(id, reactionsConfig?.emojiList || []),
      label: getEmojiLabel(id, reactionsConfig?.emojiList || []),
      enabled: false
    }))
  ];

  return (
    <div className="flex flex-wrap gap-1.5 items-center select-none pt-2 relative">
      {displayList.map(item => {
        const userList = articleReactions[item.id] || [];
        const count = userList.length;
        const hasReacted = userList.includes(currentUserId);

        return (
          <button
            key={item.id}
            onClick={(e) => handleReactionClick(e, item.id, item.emoji)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-bold transition-all hover:scale-[1.03] active:scale-95 cursor-pointer font-sans ${
              hasReacted
                ? 'bg-accent-light border-accent-color/30 text-accent-color shadow-sm'
                : 'bg-bg-app border-border-color/60 text-text-secondary hover:text-text-primary hover:border-border-color'
            }`}
            title={item.label}
          >
            <span className="text-xs">{item.emoji}</span>
            {count > 0 && <span className="text-[9px] font-mono leading-none">{count}</span>}
          </button>
        );
      })}

      {/* Render flying emojis */}
      {particles.map(p => (
        <span
          key={p.id}
          className="fixed text-2xl pointer-events-none z-[100] animate-float-up"
          style={{ left: p.clientX - 12, top: p.clientY - 24 }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
};

const NewsPollView: React.FC<{
  poll: import('../types/streaming').Poll;
  newsId: string;
  currentUserId: string;
  voteNewsPoll: (newsId: string, optionIds: string[]) => Promise<void>;
}> = ({ poll, newsId, currentUserId, voteNewsPoll }) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const isMultiple = poll.type === 'multiple';
  const hasVoted = !!(poll.votes && poll.votes[currentUserId]);
  
  const isEnded = poll.endDate && new Date(poll.endDate).getTime() < Date.now();
  const showResults = hasVoted || isEnded;

  // Calculate stats
  const totalParticipants = Object.keys(poll.votes || {}).length;
  const optionCounts: Record<string, number> = {};
  poll.options.forEach(o => optionCounts[o.id] = 0);
  let totalVotes = 0;
  
  Object.values(poll.votes || {}).forEach(userVotes => {
    userVotes.forEach(optId => {
      if (optionCounts[optId] !== undefined) {
        optionCounts[optId]++;
        totalVotes++;
      }
    });
  });

  const handleVote = () => {
    if (selectedOptions.length === 0) return;
    voteNewsPoll(newsId, selectedOptions);
  };

  const toggleOption = (id: string) => {
    if (isMultiple) {
      setSelectedOptions(prev => 
        prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]
      );
    } else {
      setSelectedOptions([id]);
    }
  };

  return (
    <div className="bg-bg-app border border-border-color rounded-[24px] p-5 shadow-sm my-4 font-sans space-y-4" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-bold text-text-primary uppercase tracking-wider font-mono">Опрос</span>
        {isEnded && (
          <span className="text-[9px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded uppercase tracking-wider font-mono">
            Завершён
          </span>
        )}
        {isMultiple && !showResults && (
          <span className="text-[9px] font-bold text-accent-color bg-accent-light px-2 py-0.5 rounded uppercase tracking-wider font-mono">
            Несколько вариантов
          </span>
        )}
      </div>
      <h4 className="text-sm font-bold text-text-primary leading-tight">{poll.question}</h4>
      
      <div className="space-y-2.5">
        {poll.options.map(opt => {
          const count = optionCounts[opt.id] || 0;
          const percentage = totalParticipants > 0 
            ? Math.round((count / totalParticipants) * 100) 
            : 0;
          const isSelectedByMe = hasVoted && poll.votes[currentUserId]?.includes(opt.id);

          if (showResults) {
            return (
              <div key={opt.id} className="relative overflow-hidden rounded-xl bg-bg-card border border-border-color/60 min-h-[40px] flex items-center px-4 z-0">
                <div 
                  className={`absolute inset-y-0 left-0 -z-10 transition-all duration-1000 ease-out ${isSelectedByMe ? 'bg-accent-color/30' : 'bg-border-color/50'}`}
                  style={{ width: `${percentage}%` }}
                />
                <div className="flex w-full justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${isSelectedByMe ? 'text-accent-color' : 'text-text-primary'}`}>
                      {opt.text}
                    </span>
                    {isSelectedByMe && <span className="text-[10px] font-bold text-accent-color font-mono hidden sm:inline">(Ваш выбор)</span>}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-mono shrink-0 pl-2">
                    <span className="text-text-muted">{count} <span className="hidden sm:inline">голосов</span></span>
                    <span className="font-bold text-text-primary w-8 text-right">{percentage}%</span>
                  </div>
                </div>
              </div>
            );
          }

          // Voting mode
          return (
            <label 
              key={opt.id} 
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                selectedOptions.includes(opt.id) 
                  ? 'border-accent-color bg-accent-light shadow-sm' 
                  : 'border-border-color bg-bg-card hover:border-accent-color/50'
              }`}
            >
              <input
                type={isMultiple ? "checkbox" : "radio"}
                name={`poll-${poll.id}`}
                checked={selectedOptions.includes(opt.id)}
                onChange={() => toggleOption(opt.id)}
                className="w-4 h-4 text-accent-color focus:ring-accent-color bg-bg-app border-border-color cursor-pointer"
              />
              <span className="text-xs font-semibold text-text-primary">{opt.text}</span>
            </label>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border-color/50 mt-4">
        <div className="text-[10px] text-text-muted font-mono">
          Проголосовало: {totalParticipants} чел.
          {poll.endDate && !isEnded && (
            <span className="ml-2 block sm:inline">
              (До {new Date(poll.endDate).toLocaleDateString('ru-RU')})
            </span>
          )}
        </div>
        {!showResults && (
          <button
            onClick={handleVote}
            disabled={selectedOptions.length === 0}
            className="px-4 py-1.5 bg-accent-color hover:bg-accent-hover disabled:bg-bg-card disabled:text-text-muted disabled:border-border-color disabled:border disabled:cursor-not-allowed text-white text-[10px] font-bold uppercase tracking-wider font-mono rounded-lg transition-all cursor-pointer shadow-soft active:scale-95"
          >
            Отправить голос
          </button>
        )}
      </div>
    </div>
  );
};

export const NewsView: React.FC = () => {
  const { news, rateNews, addNewsComment, addNews, reactionsConfig, toggleNewsReaction, voteNewsPoll, activeNewsId, setActiveNewsId } = useStreaming();

  // Comments form local states
  const [nickname, setNickname] = useState(() => {
    return localStorage.getItem('penis_ink_nickname') || '';
  });
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [replyTo, setReplyTo] = useState<{ commentId: string; author: string } | null>(null);

  // Write news form local states
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsTag, setNewsTag] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsImage, setNewsImage] = useState('');
  const [newsVideoUrl, setNewsVideoUrl] = useState('');
  const [newsVideoSource, setNewsVideoSource] = useState<'link' | 'upload'>('link');
  const [newsHashtags, setNewsHashtags] = useState('');

  // Filtering local states
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'default' | 'newest' | 'hashtags'>('default');
  
  // Poll form local states
  const [includePoll, setIncludePoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollType, setPollType] = useState<'single' | 'multiple'>('single');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollEndDate, setPollEndDate] = useState('');

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const currentUserId = getOrCreateUserId();

  // Extract unique hashtags from all news, sorted by popularity (frequency) first, then alphabetically
  const allHashtags = React.useMemo(() => {
    const frequency: Record<string, number> = {};
    news.forEach(item => {
      if (item.hashtags) {
        item.hashtags.forEach(t => {
          const cleanTag = t.toLowerCase().trim();
          frequency[cleanTag] = (frequency[cleanTag] || 0) + 1;
        });
      }
    });
    return Object.keys(frequency).sort((a, b) => {
      const freqDiff = frequency[b] - frequency[a];
      if (freqDiff !== 0) return freqDiff;
      return a.localeCompare(b);
    });
  }, [news]);

  // Filter and sort news by selected hashtag and chosen sort option
  const filteredNews = React.useMemo(() => {
    let result = [...news];
    if (selectedHashtag) {
      result = result.filter(item => 
        item.hashtags?.some(t => t.toLowerCase().trim() === selectedHashtag.toLowerCase().trim())
      );
    }
    
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (sortBy === 'hashtags') {
      result.sort((a, b) => {
        const hasA = a.hashtags && a.hashtags.length > 0;
        const hasB = b.hashtags && b.hashtags.length > 0;
        if (!hasA && !hasB) return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (!hasA) return 1;
        if (!hasB) return -1;
        
        const tagA = a.hashtags![0].toLowerCase().trim();
        const tagB = b.hashtags![0].toLowerCase().trim();
        const tagDiff = tagA.localeCompare(tagB);
        if (tagDiff !== 0) return tagDiff;
        
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    }
    return result;
  }, [news, selectedHashtag, sortBy]);

  // Find the highest rated news item to display at the top as a teaser/highlight
  const highestRatedNews = React.useMemo(() => {
    if (news.length === 0) return null;
    return [...news].sort((a, b) => {
      const avgA = getNewsAverageRating(a.ratings).average;
      const avgB = getNewsAverageRating(b.ratings).average;
      return avgB - avgA;
    })[0];
  }, [news]);

  const handleSubmitComment = async (e: React.FormEvent, newsId: string) => {
    e.preventDefault();
    setCommentError('');

    const trimmedNickname = nickname.trim();
    const trimmedText = commentText.trim();

    if (!trimmedNickname) {
      setCommentError('Пожалуйста, укажите ваш псевдоним.');
      return;
    }
    if (!trimmedText) {
      setCommentError('Пожалуйста, напишите текст комментария.');
      return;
    }

    try {
      localStorage.setItem('penis_ink_nickname', trimmedNickname);
      await addNewsComment(newsId, trimmedNickname, trimmedText, replyTo?.commentId, replyTo?.author);
      setCommentText('');
      setReplyTo(null);
    } catch (err) {
      console.error(err);
      setCommentError('Не удалось отправить комментарий. Попробуйте еще раз.');
    }
  };

  const handleReplyClick = (comment: any, newsId: string) => {
    setReplyTo({ commentId: comment.id, author: comment.author });
    const textarea = document.getElementById(`comment-${newsId}`);
    if (textarea) {
      textarea.focus();
    }
  };

  const handlePublishNews = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const trimmedTitle = newsTitle.trim();
    const trimmedTag = newsTag.trim() || 'НОВОСТЬ';
    const trimmedContent = newsContent.trim();

    if (!trimmedTitle) {
      setFormError('Пожалуйста, введите заголовок новости.');
      return;
    }
    if (!trimmedContent) {
      setFormError('Пожалуйста, введите содержание новости.');
      return;
    }

    let pollData = undefined;
    if (includePoll) {
      const trimmedQuestion = pollQuestion.trim();
      if (!trimmedQuestion) {
        setFormError('Пожалуйста, введите вопрос для опроса.');
        return;
      }
      const validOptions = pollOptions.map(o => o.trim()).filter(o => o !== '');
      if (validOptions.length < 2) {
        setFormError('Опрос должен содержать минимум 2 варианта ответа.');
        return;
      }
      pollData = {
        id: 'poll-' + Math.random().toString(36).substring(2, 11),
        question: trimmedQuestion,
        type: pollType,
        options: validOptions.map(text => ({
          id: 'opt-' + Math.random().toString(36).substring(2, 9),
          text
        })),
        votes: {},
        ...(pollEndDate ? { endDate: new Date(pollEndDate).toISOString() } : {})
      };
    }

    const hashtagsArray = newsHashtags
      .split(',')
      .map(tag => tag.trim().replace(/^#/, ''))
      .filter(tag => tag.length > 0);

    try {
      await addNews({
        title: trimmedTitle,
        tag: trimmedTag.toUpperCase(),
        content: trimmedContent,
        imageUrl: newsImage || undefined,
        videoUrl: newsVideoUrl.trim() || undefined,
        hashtags: hashtagsArray.length > 0 ? hashtagsArray : undefined,
        date: new Date().toISOString(),
        poll: pollData
      });
      
      setFormSuccess('Новость успешно опубликована!');
      setNewsTitle('');
      setNewsTag('');
      setNewsContent('');
      setNewsImage('');
      setNewsVideoUrl('');
      setNewsVideoSource('link');
      setNewsHashtags('');
      setIncludePoll(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      setPollEndDate('');
      setPollType('single');
      
      setTimeout(() => {
        setShowWriteForm(false);
        setFormSuccess('');
      }, 2000);
    } catch (err) {
      console.error(err);
      setFormError('Не удалось опубликовать новость.');
    }
  };

  // Recursive renderer for tree comments
  const renderCommentNode = (node: CommentNode, depth: number = 0) => {
    const comment = node.comment;
    const isOwner = comment.userId === currentUserId;
    const gradient = getAvatarGradient(comment.author);
    const initials = getInitials(comment.author);
    
    const indentClass = depth === 0 
      ? '' 
      : depth > 3 
        ? 'pl-1 ml-1.5 mt-3' 
        : 'pl-3 md:pl-5 border-l-2 border-accent-color/10 ml-3.5 md:ml-4.5 mt-3';

    return (
      <div key={comment.id} className="space-y-3">
        {/* Comment Card */}
        <div className={`flex gap-3 bg-bg-app border border-border-color rounded-2xl p-3.5 hover:border-accent-color/20 transition-all group font-sans shadow-soft ${
          depth > 0 ? 'bg-bg-app/50 border-border-color/70' : ''
        }`}>
          <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${gradient} text-white font-bold flex items-center justify-center text-[9px] shrink-0 uppercase tracking-wider`}>
            {initials}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-text-primary truncate">{comment.author}</span>
                {isOwner && (
                  <span className="text-[8px] px-1 py-0.2 rounded bg-accent-light text-accent-color border border-accent-color/10 font-semibold font-mono">
                    Вы
                  </span>
                )}
                {comment.replyToAuthor && depth > 0 && (
                  <span className="text-[9px] text-accent-color font-bold flex items-center gap-0.5 font-sans">
                    <CornerDownRight className="w-2.5 h-2.5 text-accent-color/50" />
                    <span>ответил @{comment.replyToAuthor}</span>
                  </span>
                )}
              </div>
              <span className="text-[8px] text-text-muted font-mono shrink-0">
                {formatCommentDate(comment.createdAt)}
              </span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap break-words select-text font-sans">
              {comment.text}
            </p>
            
            <button
              type="button"
              onClick={() => handleReplyClick(comment, activeNewsId || '')}
              className="text-[9px] font-bold text-accent-color hover:underline cursor-pointer pt-1 flex items-center gap-0.5"
            >
              Ответить
            </button>
          </div>
        </div>

        {/* Child comments */}
        {node.replies.length > 0 && (
          <div className={indentClass}>
            {node.replies.map(replyNode => renderCommentNode(replyNode, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // ── Body scroll lock when overlay is open ───────────────────────────────
  useEffect(() => {
    if (!activeNewsId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [activeNewsId]);

  // ── Esc key closes the overlay ────────────────────────────────────────────
  const closeOverlay = useCallback(() => {
    setActiveNewsId(null);
    setCommentError('');
    setCommentText('');
    setReplyTo(null);
  }, []);

  useEffect(() => {
    if (!activeNewsId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeOverlay(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeNewsId, closeOverlay]);

  // ── Compute article data for the overlay ─────────────────────────────────
  const selectedArticle = activeNewsId ? news.find(n => n.id === activeNewsId) ?? null : null;
  const articleRating = selectedArticle ? getNewsAverageRating(selectedArticle.ratings) : { average: '0.0', count: 0 };
  const userRating = selectedArticle ? (selectedArticle.ratings?.[currentUserId] || 0) : 0;
  const commentTree = selectedArticle ? buildCommentTree(selectedArticle.comments || []) : [];

  const relatedNews = React.useMemo(() => {
    if (!selectedArticle || !selectedArticle.hashtags || selectedArticle.hashtags.length === 0) return [];
    const currentTags = selectedArticle.hashtags.map(t => t.toLowerCase().trim());
    return news
      .filter(item => {
        if (item.id === selectedArticle.id) return false;
        if (!item.hashtags || item.hashtags.length === 0) return false;
        return item.hashtags.some(tag => currentTags.includes(tag.toLowerCase().trim()));
      })
      .slice(0, 3); // Display at most 3 related news
  }, [selectedArticle, news]);

  // ── Render general feed layout (Hero, stats, list/grid) ──────────────────
  return (
    <div className="space-y-8 animate-[fadeIn_0.3s_ease-out] glass-panel">
      
      {/* 1. HERO BANNER & STATS */}
      <div className="relative rounded-[32px] overflow-hidden border border-border-color bg-bg-card p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center justify-between shadow-soft">
        <div className="absolute inset-0 z-0">
          <div className="w-full h-full bg-gradient-to-tr from-accent-light via-bg-card/50 to-bg-card opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-bg-card/85 to-transparent" />
        </div>

        <div className="relative z-10 space-y-3 flex-1 text-center md:text-left w-full">
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-accent-light text-accent-color border border-accent-color/20 flex items-center gap-1 w-fit mx-auto md:mx-0 font-mono">
            <Newspaper className="w-3.5 h-3.5" />
            <span>Раздел новостей</span>
          </span>
          <h1 className="text-2xl md:text-4xl font-extrabold text-text-primary tracking-tight leading-tight">
            Новости Сообщества <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent-color to-accent-hover">Varicose Squad</span>
          </h1>
          <p className="text-xs md:text-sm text-text-secondary leading-relaxed max-w-xl font-sans">
            Будьте в курсе всех нововведений, событий игрового сервера и расписания релизов! Ставьте оценки новостям и пишите свои отзывы в комментариях.
          </p>
        </div>

        {/* Stats Card */}
        {news.length > 0 && (
          <div className="relative z-10 bg-bg-card border border-border-color p-5 rounded-2xl flex flex-col items-center gap-3 w-full max-w-xs shrink-0 shadow-soft">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest font-mono">СТАТИСТИКА</span>
            <div className="flex gap-4 text-center mt-1 w-full justify-around text-text-secondary font-mono text-[10px]">
              <div>
                <span className="block text-text-muted text-[8px] uppercase tracking-wider font-sans mb-0.5">Всего новостей</span>
                <span className="font-bold text-text-primary text-sm">{news.length}</span>
              </div>
              <div className="border-l border-border-color h-8" />
              {highestRatedNews && (
                <div>
                  <span className="block text-text-muted text-[8px] uppercase tracking-wider font-sans mb-0.5 flex items-center justify-center gap-0.5">
                    <Award className="w-3 h-3 text-yellow-500" />
                    <span>Топ оценка</span>
                  </span>
                  <span className="font-bold text-text-primary text-sm flex items-center justify-center gap-0.5">
                    <Star className="w-3.5 h-3.5 fill-current text-yellow-500" />
                    <span>
                      {getNewsAverageRating(highestRatedNews.ratings).average || '0.0'}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 1.5 PUBLISH NEWS BUTTON / FORM */}
      <div className="bg-bg-card border border-border-color rounded-[32px] p-5 md:p-6 shadow-soft space-y-4 animate-[fadeIn_0.2s_ease-out]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-accent-light border border-accent-color/20 text-accent-color shrink-0 flex items-center justify-center">
              <Plus className="w-4.5 h-4.5" />
            </span>
            <div>
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono">Поделитесь новостью</h3>
              <p className="text-[10px] text-text-secondary font-sans leading-relaxed">Любой участник Varicose Squad может опубликовать новость для всех.</p>
            </div>
          </div>
          <button
            onClick={() => {
              setFormError('');
              setFormSuccess('');
              setNewsImage('');
              setShowWriteForm(prev => !prev);
            }}
            className="px-4 py-2.5 bg-accent-color hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-soft hover:scale-[1.01] transition-all cursor-pointer self-start sm:self-center shrink-0"
          >
            {showWriteForm ? 'Скрыть форму' : 'Написать новость'}
          </button>
        </div>

        {showWriteForm && (
          <form onSubmit={handlePublishNews} className="space-y-4 pt-4 border-t border-border-color animate-[fadeIn_0.2s_ease-out] font-sans">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-[9px] font-bold text-text-secondary uppercase tracking-wider font-mono block">Заголовок новости *</label>
                <input 
                  type="text" 
                  value={newsTitle}
                  onChange={(e) => setNewsTitle(e.target.value)}
                  placeholder="Введите краткий, привлекающий внимание заголовок..."
                  className="w-full bg-bg-app border border-border-color rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-color/50 focus:ring-1 focus:ring-accent-color/40 transition-all font-sans"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-text-secondary uppercase tracking-wider font-mono block">Тег новости (например: ВАЖНО, ОБНОВЛЕНИЕ)</label>
                <input 
                  type="text" 
                  value={newsTag}
                  onChange={(e) => setNewsTag(e.target.value)}
                  placeholder="НОВОСТЬ"
                  className="w-full bg-bg-app border border-border-color rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-color/50 focus:ring-1 focus:ring-accent-color/40 transition-all font-mono uppercase"
                  maxLength={15}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-text-secondary uppercase tracking-wider font-mono block">Содержание новости *</label>
              <textarea 
                value={newsContent}
                onChange={(e) => setNewsContent(e.target.value)}
                placeholder="Напишите текст новости со всеми подробностями..."
                className="w-full bg-bg-app border border-border-color rounded-xl px-3 py-2.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-color/50 focus:ring-1 focus:ring-accent-color/40 transition-all resize-none min-h-[100px] font-sans"
                required
              />
            </div>

            {/* Poll Creation Section */}
            <div className="space-y-3 pt-3 border-t border-border-color">
              <label className="flex items-center gap-2 cursor-pointer w-fit group">
                <input
                  type="checkbox"
                  checked={includePoll}
                  onChange={(e) => setIncludePoll(e.target.checked)}
                  className="w-4 h-4 rounded text-accent-color focus:ring-accent-color bg-bg-app border-border-color transition-all cursor-pointer"
                />
                <span className="text-xs font-bold text-text-primary group-hover:text-accent-color transition-colors font-mono uppercase tracking-wider">
                  Прикрепить опрос
                </span>
              </label>

              {includePoll && (
                <div className="bg-bg-app border border-border-color p-4 rounded-xl space-y-4 animate-[fadeIn_0.2s_ease-out]">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-text-secondary uppercase tracking-wider font-mono block">Вопрос опроса *</label>
                    <input 
                      type="text" 
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      placeholder="Например: Какую версию сервера поставить?"
                      className="w-full bg-bg-card border border-border-color rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-color/50 focus:ring-1 focus:ring-accent-color/40 transition-all font-sans"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-text-secondary uppercase tracking-wider font-mono block">Тип голосования</label>
                      <select
                        value={pollType}
                        onChange={(e) => setPollType(e.target.value as 'single' | 'multiple')}
                        className="w-full bg-bg-card border border-border-color rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent-color/50 focus:ring-1 focus:ring-accent-color/40 transition-all cursor-pointer font-sans"
                      >
                        <option value="single">Один вариант</option>
                        <option value="multiple">Несколько вариантов</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-text-secondary uppercase tracking-wider font-mono block">Дата окончания (опционально)</label>
                      <input 
                        type="datetime-local" 
                        value={pollEndDate}
                        onChange={(e) => setPollEndDate(e.target.value)}
                        className="w-full bg-bg-card border border-border-color rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent-color/50 focus:ring-1 focus:ring-accent-color/40 transition-all font-sans"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-text-secondary uppercase tracking-wider font-mono flex items-center justify-between">
                      <span>Варианты ответа * (минимум 2)</span>
                      <button 
                        type="button" 
                        onClick={() => setPollOptions([...pollOptions, ''])}
                        className="text-accent-color hover:text-accent-hover text-[10px] font-bold font-sans cursor-pointer flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Добавить
                      </button>
                    </label>
                    
                    <div className="space-y-2">
                      {pollOptions.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input 
                            type="text" 
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...pollOptions];
                              newOpts[i] = e.target.value;
                              setPollOptions(newOpts);
                            }}
                            placeholder={`Вариант ${i + 1}`}
                            className="flex-1 bg-bg-card border border-border-color rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-color/50 focus:ring-1 focus:ring-accent-color/40 transition-all font-sans"
                          />
                          {pollOptions.length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newOpts = [...pollOptions];
                                newOpts.splice(i, 1);
                                setPollOptions(newOpts);
                              }}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors shrink-0 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Video Input Selector */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-text-secondary uppercase tracking-wider block font-mono">
                Видео к новости (необязательно)
              </label>
              <div className="flex gap-2 bg-bg-app border border-border-color p-0.5 rounded-lg text-[9px] font-semibold w-fit mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewsVideoSource('link');
                    if (newsVideoUrl.startsWith('data:')) setNewsVideoUrl('');
                  }}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer font-bold ${
                    newsVideoSource === 'link'
                      ? 'bg-accent-color text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Ссылка
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewsVideoSource('upload');
                    if (!newsVideoUrl.startsWith('data:')) setNewsVideoUrl('');
                  }}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer font-bold ${
                    newsVideoSource === 'upload'
                      ? 'bg-accent-color text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Загрузить файл
                </button>
              </div>

              {newsVideoSource === 'link' ? (
                <input 
                  type="url" 
                  value={newsVideoUrl}
                  onChange={(e) => setNewsVideoUrl(e.target.value)}
                  placeholder="Вставьте ссылку на видео (YouTube, Google Drive, MP4)..."
                  className="w-full bg-bg-app border border-border-color rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-color/50 focus:ring-1 focus:ring-accent-color/40 transition-all font-sans"
                />
              ) : (
                <div className="space-y-2">
                  {newsVideoUrl && newsVideoUrl.startsWith('data:video/') ? (
                    <div className="relative aspect-video max-w-sm rounded-xl border border-border-color overflow-hidden bg-bg-app">
                      <video 
                        src={newsVideoUrl} 
                        controls 
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setNewsVideoUrl('')}
                        className="absolute top-2 right-2 p-1 rounded-md bg-black/60 hover:bg-black/80 text-slate-350 hover:text-white transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="border border-dashed border-border-color rounded-xl p-4 text-center flex flex-col items-center justify-center gap-2 bg-bg-app max-w-sm">
                      <p className="text-text-muted text-[10px] font-semibold font-sans">Выберите видеофайл MP4, WebM или Ogg (до 15 МБ)</p>
                      <VideoUploader 
                        onVideoUploaded={(base64) => setNewsVideoUrl(base64)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Hashtags Input */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-text-secondary uppercase tracking-wider block font-mono">
                Хэштеги (через запятую)
              </label>
              <input 
                type="text" 
                value={newsHashtags}
                onChange={(e) => setNewsHashtags(e.target.value)}
                placeholder="важно, майнкрафт, релиз..."
                className="w-full bg-bg-app border border-border-color rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-color/50 focus:ring-1 focus:ring-accent-color/40 transition-all font-sans"
              />
            </div>

            {/* Image Upload Selector */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-text-secondary uppercase tracking-wider block font-mono">
                Изображение к новости (необязательно)
              </label>
              
              {newsImage ? (
                <div className="relative aspect-video max-w-sm rounded-xl border border-border-color overflow-hidden bg-bg-app">
                  <img 
                    src={newsImage} 
                    alt="Превью новости" 
                    className="w-full h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setNewsImage('')}
                    className="absolute top-2 right-2 p-1 rounded-md bg-black/60 hover:bg-black/80 text-slate-350 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="border border-dashed border-border-color rounded-xl p-4 text-center flex flex-col items-center justify-center gap-2 bg-bg-app max-w-sm">
                  <p className="text-text-muted text-[10px] font-semibold font-sans">Выберите изображение JPG, PNG или WebP</p>
                  <ImageUploader 
                    onImageUploaded={(base64) => setNewsImage(base64)}
                    maxWidth={1000}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 font-sans">
              <div>
                {formError && <span className="text-[10px] text-rose-500 font-semibold">{formError}</span>}
                {formSuccess && <span className="text-[10px] text-emerald-550 font-semibold">{formSuccess}</span>}
              </div>
              <button
                type="submit"
                className="bg-accent-color hover:bg-accent-hover text-white rounded-xl px-4 py-2 flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-soft active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Опубликовать</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 2. NEWS LIST GRID */}
      <div className="space-y-6">
        {/* Filter and Sort Bar */}
        {news.length > 0 && (
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
            {allHashtags.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center bg-bg-card border border-border-color p-2 rounded-[20px] shadow-soft select-none overflow-x-auto max-w-full flex-1">
                <button
                  onClick={() => setSelectedHashtag(null)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    selectedHashtag === null
                      ? 'bg-accent-color text-white shadow-soft'
                      : 'text-text-secondary hover:text-text-primary bg-bg-app border border-border-color/65'
                  }`}
                >
                  Все
                </button>
                {allHashtags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedHashtag(tag)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                      selectedHashtag === tag
                        ? 'bg-accent-color text-white shadow-soft'
                        : 'text-text-secondary hover:text-text-primary bg-bg-app border border-border-color/65'
                    }`}
                  >
                    <span>#{tag}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Sorting controls */}
            <div className="flex items-center gap-2 bg-bg-card border border-border-color p-1.5 rounded-[20px] shadow-soft shrink-0 select-none">
              <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider pl-1.5 flex items-center gap-1 font-mono">
                <ArrowUpDown className="w-3 h-3" />
                <span>Сортировка:</span>
              </span>
              <div className="flex gap-1 bg-bg-app p-0.5 rounded-xl border border-border-color/50 text-[9px]">
                <button
                  type="button"
                  onClick={() => setSortBy('default')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    sortBy === 'default'
                      ? 'bg-accent-color text-white shadow-soft'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  По умолчанию
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('newest')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    sortBy === 'newest'
                      ? 'bg-accent-color text-white shadow-soft'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Сначала новые
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('hashtags')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    sortBy === 'hashtags'
                      ? 'bg-accent-color text-white shadow-soft'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  По хэштегам
                </button>
              </div>
            </div>
          </div>
        )}

        {news.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-border-color p-12 text-center space-y-4 bg-bg-card shadow-soft font-sans">
            <Newspaper className="w-12 h-12 text-text-muted mx-auto animate-pulse" />
            <h2 className="text-lg font-bold text-text-primary">Новостей пока нет</h2>
            <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
              Администратор еще не опубликовал никаких новостей. Загляните сюда позже!
            </p>
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-border-color p-12 text-center space-y-4 bg-bg-card shadow-soft font-sans">
            <Newspaper className="w-12 h-12 text-text-muted mx-auto animate-pulse" />
            <h2 className="text-lg font-bold text-text-primary">Новости не найдены</h2>
            <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
              Нет новостей с хэштегом #{selectedHashtag}.
            </p>
            <button
              onClick={() => setSelectedHashtag(null)}
              className="px-4 py-2 bg-accent-light hover:bg-accent-color hover:text-white border border-accent-color/20 text-accent-color rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Показать все новости
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
            {filteredNews.map((item) => {
              const { average } = getNewsAverageRating(item.ratings);
              return (
                <div 
                  key={item.id} 
                  onClick={() => setActiveNewsId(item.id)}
                  className="bg-bg-card border border-border-color rounded-[24px] overflow-hidden flex flex-col transition-all duration-300 hover:border-accent-color/30 hover:scale-[1.01] hover:shadow-hover cursor-pointer group shadow-soft"
                >
                  {/* Card Image */}
                  <div className="relative aspect-[16/9] w-full bg-bg-app border-b border-border-color/60 overflow-hidden shrink-0">
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt={item.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : item.videoUrl && getYouTubeThumbnail(item.videoUrl) ? (
                      <img 
                        src={getYouTubeThumbnail(item.videoUrl)!} 
                        alt={item.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      // Placeholder when image is missing
                      <div className="w-full h-full bg-gradient-to-tr from-accent-light/40 to-bg-card flex flex-col items-center justify-center gap-2 text-text-muted select-none">
                        <Newspaper className="w-8 h-8 opacity-45 group-hover:scale-110 transition-transform duration-300" />
                        <span className="text-[10px] font-bold tracking-wider font-mono">VARICOSE SQUAD</span>
                      </div>
                    )}

                    {/* Video badge icon overlay */}
                    {item.videoUrl && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-colors">
                        <div className="p-2.5 bg-accent-color text-white rounded-full scale-90 group-hover:scale-100 transition-transform shadow-md">
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </div>
                      </div>
                    )}
                    
                    {/* Tag overlay */}
                    <span className="absolute top-3 left-3 text-[8px] font-mono font-bold text-accent-color bg-bg-card/90 backdrop-blur-xs px-2.5 py-0.5 rounded-lg border border-accent-color/20 uppercase tracking-wider shadow-soft">
                      {item.tag}
                    </span>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
                    <div className="space-y-2.5">
                      {/* Meta Info */}
                      <div className="flex items-center justify-between text-[9px] text-text-muted font-mono">
                        <span className="flex items-center gap-1 font-sans">
                           <Calendar className="w-3 h-3" />
                          <span>{formatNewsDate(item.date)}</span>
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5 text-yellow-500 font-bold bg-bg-app px-1.5 py-0.5 rounded border border-border-color/40">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            <span>{average > 0 ? average : '0.0'}</span>
                          </div>
                          <div className="flex items-center gap-0.5 text-accent-color font-bold bg-bg-app px-1.5 py-0.5 rounded border border-border-color/40">
                            <MessageSquare className="w-2.5 h-2.5" />
                            <span>{item.comments?.length || 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-xs md:text-sm font-extrabold text-text-primary group-hover:text-accent-color transition-colors line-clamp-2 leading-tight tracking-tight">
                        {item.title}
                      </h3>

                      {/* Excerpt */}
                      <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-3 font-sans break-words">
                        {item.content}
                      </p>

                      {/* Hashtags */}
                      {item.hashtags && item.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {item.hashtags.map((tag) => (
                            <span
                              key={tag}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedHashtag(tag);
                              }}
                              className="text-[9px] font-semibold text-accent-color hover:underline cursor-pointer bg-accent-light px-1.5 py-0.5 rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Poll View (Card) */}
                      {item.poll && (
                        <div onClick={e => e.stopPropagation()}>
                          <NewsPollView 
                            poll={item.poll} 
                            newsId={item.id} 
                            currentUserId={currentUserId} 
                            voteNewsPoll={voteNewsPoll} 
                          />
                        </div>
                      )}


                    </div>

                    {/* Footer Action */}
                    <div className="flex items-center justify-between pt-2 border-t border-border-color/40 text-[10px] font-bold text-accent-color">
                      <span>Читать подробнее</span>
                      <CornerDownRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          FULLSCREEN ARTICLE OVERLAY
          Rendered on top of everything when a card is clicked.
          z-50 covers sidebar, header, and the main scroll container.
      ══════════════════════════════════════════════════════════════ */}
      {activeNewsId && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out] overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) closeOverlay(); }}
        >
          <div className="relative w-full max-w-3xl mx-auto my-6 px-4 font-sans">

            {/* ── Close button (top-right, always visible) ── */}
            <button
              onClick={closeOverlay}
              aria-label="Закрыть новость"
              className="absolute -top-1 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-bg-card border border-border-color shadow-soft hover:bg-bg-app hover:border-accent-color/30 text-text-secondary hover:text-text-primary transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {!selectedArticle ? (
              /* ── Not found state ── */
              <div className="bg-bg-card border border-border-color rounded-[32px] p-12 text-center space-y-4 shadow-soft mt-8">
                <Newspaper className="w-12 h-12 text-rose-500 mx-auto animate-bounce" />
                <h2 className="text-lg font-bold text-text-primary">Новость не найдена</h2>
                <p className="text-xs text-text-secondary max-w-sm mx-auto">
                  К сожалению, запрашиваемая новость не существует или была удалена.
                </p>
                <button
                  onClick={closeOverlay}
                  className="px-4 py-2 bg-accent-color hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-soft transition-all cursor-pointer"
                >
                  Назад к списку
                </button>
              </div>
            ) : (
              /* ── Full article card ── */
              <div className="bg-bg-card border border-border-color rounded-[32px] overflow-hidden shadow-soft">

                {/* Header bar: tag + back link */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border-color">
                  <span className="text-[10px] font-mono font-bold text-accent-color bg-accent-light px-2.5 py-0.5 rounded-lg border border-accent-color/20 uppercase tracking-wider">
                    {selectedArticle.tag}
                  </span>
                  <div className="flex items-center gap-3 text-[10px] text-text-muted font-mono">
                    <span className="flex items-center gap-1 font-sans">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatNewsDate(selectedArticle.date)}</span>
                    </span>
                    <button
                      onClick={closeOverlay}
                      className="flex items-center gap-1 text-text-secondary hover:text-accent-color font-sans font-bold transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                      <span>Назад</span>
                    </button>
                  </div>
                </div>

                 {/* Full-width media banner (Video player has priority) */}
                {selectedArticle.videoUrl ? (
                  renderNewsVideoPlayer(selectedArticle.videoUrl)
                ) : selectedArticle.imageUrl ? (
                  <div className="w-full bg-bg-app border-b border-border-color/60 max-h-[420px] flex items-center justify-center overflow-hidden">
                    <img
                      src={selectedArticle.imageUrl}
                      alt={selectedArticle.title}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : null}

                {/* Body */}
                <div className="p-6 md:p-8 space-y-6">

                  {/* Title */}
                  <h1 className="text-xl md:text-3xl font-extrabold text-text-primary tracking-tight leading-tight">
                    {selectedArticle.title}
                  </h1>

                  {/* Full text */}
                  <p className="text-xs md:text-sm text-text-secondary leading-relaxed whitespace-pre-wrap break-words">
                    {selectedArticle.content}
                  </p>

                  {/* Secondary Image if video is playing at the top */}
                  {selectedArticle.videoUrl && selectedArticle.imageUrl && (
                    <div className="w-full bg-bg-app border border-border-color/60 rounded-2xl max-h-[360px] flex items-center justify-center overflow-hidden">
                      <img
                        src={selectedArticle.imageUrl}
                        alt={selectedArticle.title}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}

                  {/* Poll View (Overlay) */}
                  {selectedArticle.poll && (
                    <NewsPollView 
                      poll={selectedArticle.poll} 
                      newsId={selectedArticle.id} 
                      currentUserId={currentUserId} 
                      voteNewsPoll={voteNewsPoll} 
                    />
                  )}

                  {/* Article Hashtags */}
                  {selectedArticle.hashtags && selectedArticle.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border-color/40">
                      {selectedArticle.hashtags.map((tag) => (
                        <span
                          key={tag}
                          onClick={() => {
                            setSelectedHashtag(tag);
                            closeOverlay();
                          }}
                          className="text-[9px] font-bold text-accent-color hover:underline cursor-pointer bg-accent-light px-2.5 py-0.5 rounded-lg border border-accent-color/10"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="pt-2">
                    <h4 className="text-xs font-bold text-text-primary mb-2 font-mono uppercase tracking-wider">Реакции</h4>
                    <NewsReactions
                      article={selectedArticle}
                      currentUserId={currentUserId}
                      reactionsConfig={reactionsConfig}
                      toggleNewsReaction={toggleNewsReaction}
                    />
                  </div>

                  {/* Rating block */}
                  <div className="bg-bg-app border border-border-color/70 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm select-none">
                    <div className="space-y-0.5 text-center sm:text-left">
                      <h4 className="text-xs font-bold text-text-primary flex items-center justify-center sm:justify-start gap-1 font-mono uppercase tracking-wider">
                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                        <span>Оцените эту новость</span>
                      </h4>
                      <p className="text-[10px] text-text-secondary font-sans">Ваша оценка поможет отсортировать важные новости выше в ленте.</p>
                    </div>

                    <div className="flex items-center gap-4 bg-bg-card border border-border-color px-4 py-2 rounded-xl shadow-soft">
                      <div className="flex items-center gap-1 font-mono text-yellow-500 font-bold text-xs shrink-0 pr-3 border-r border-border-color">
                        <span>★ {articleRating.count > 0 ? articleRating.average : '0.0'}</span>
                        <span className="text-[9px] text-text-muted font-normal font-sans">({articleRating.count} голосов)</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => rateNews(selectedArticle.id, star)}
                            className={`text-[15px] focus:outline-none transition-all hover:scale-125 cursor-pointer ${
                              star <= userRating
                                ? 'text-yellow-500 font-bold filter drop-shadow-[0_0_3px_rgba(234,179,8,0.4)]'
                                : 'text-text-muted hover:text-yellow-500'
                            }`}
                            title={`Оценить на ${star}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Related News */}
                  {relatedNews.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-border-color/40 select-none font-sans">
                      <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5 font-mono uppercase tracking-wider">
                        <Film className="w-3.5 h-3.5 text-accent-color" />
                        <span>Читайте также (Похожие новости)</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {relatedNews.map((item) => {
                          const { average } = getNewsAverageRating(item.ratings);
                          return (
                            <div
                              key={item.id}
                              onClick={() => setActiveNewsId(item.id)}
                              className="p-3 bg-bg-app hover:bg-bg-app/80 border border-border-color hover:border-accent-color/30 rounded-2xl flex flex-col justify-between space-y-2 cursor-pointer transition-all duration-300 group shadow-soft"
                            >
                              <div className="space-y-1">
                                <span className="text-[7px] font-mono font-bold text-accent-color bg-accent-light px-1.5 py-0.2 rounded border border-accent-color/10 w-fit block uppercase tracking-wider">
                                  {item.tag}
                                </span>
                                <h5 className="text-[11px] font-bold text-text-primary group-hover:text-accent-color transition-colors leading-snug line-clamp-2">
                                  {item.title}
                                </h5>
                              </div>
                              <div className="flex items-center justify-between text-[8px] text-text-muted font-mono pt-1 border-t border-border-color/30">
                                <span>{new Date(item.date).toLocaleDateString('ru-RU')}</span>
                                <div className="flex items-center gap-0.5 text-yellow-500 font-bold">
                                  <span>★ {average > 0 ? average : '0.0'}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Comments section */}
                  <div className="space-y-4 pt-2 border-t border-border-color">
                    <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5 font-mono uppercase tracking-wider border-b border-border-color pb-2 pt-2">
                      <MessageSquare className="w-3.5 h-3.5 text-accent-color" />
                      <span>Комментарии ({selectedArticle.comments?.length || 0})</span>
                    </h4>

                    {/* Comment form */}
                    <form onSubmit={(e) => handleSubmitComment(e, selectedArticle.id)} className="space-y-3 bg-bg-app border border-border-color p-4 rounded-2xl shadow-soft">
                      <div className="flex flex-col md:flex-row gap-3">
                        <div className="w-full md:w-1/4">
                          <label htmlFor={`nickname-ov-${selectedArticle.id}`} className="block text-[9px] font-bold text-text-secondary uppercase tracking-wider mb-1.5 font-mono">
                            Псевдоним
                          </label>
                          <input
                            id={`nickname-ov-${selectedArticle.id}`}
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="Никнейм..."
                            className="w-full bg-bg-card border border-border-color rounded-xl px-3 py-2.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-color/50 focus:ring-1 focus:ring-accent-color/40 transition-all font-sans"
                            maxLength={25}
                          />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label htmlFor={`comment-ov-${selectedArticle.id}`} className="block text-[9px] font-bold text-text-secondary uppercase tracking-wider font-mono">
                              Комментарий
                            </label>
                            {replyTo && (
                              <div className="flex items-center gap-1.5 bg-accent-light border border-accent-color/15 px-2 py-0.5 rounded-lg text-[9px] font-bold text-accent-color">
                                <span>Ответ @{replyTo.author}</span>
                                <button type="button" onClick={() => setReplyTo(null)} className="cursor-pointer">
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}
                          </div>
                          <textarea
                            id={`comment-ov-${selectedArticle.id}`}
                            rows={2}
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder={replyTo ? `Ответ для @${replyTo.author}...` : 'Напишите комментарий...'}
                            className="w-full bg-bg-card border border-border-color rounded-xl px-3 py-2.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-color/50 focus:ring-1 focus:ring-accent-color/40 transition-all resize-none font-sans"
                            maxLength={500}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <div>
                          {commentError && <span className="text-[10px] text-rose-500 font-semibold">{commentError}</span>}
                        </div>
                        <button
                          type="submit"
                          className="bg-accent-color hover:bg-accent-hover text-white rounded-xl px-4 py-2 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-soft active:scale-95"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Отправить</span>
                        </button>
                      </div>
                    </form>

                    {/* Comments list */}
                    <div className="space-y-4">
                      {commentTree.length === 0 ? (
                        <div className="text-center py-6 border border-dashed border-border-color rounded-2xl bg-bg-app text-text-muted text-xs font-sans">
                          Комментариев пока нет. Напишите первый отзыв!
                        </div>
                      ) : (
                        commentTree.map(node => renderCommentNode(node))
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
