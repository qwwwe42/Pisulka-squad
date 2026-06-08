import React, { useState } from 'react';
import { useStreaming, getNewsAverageRating, getOrCreateUserId } from '../context/StreamingContext';
import { 
  Newspaper, Star, MessageSquare, Send, Calendar, 
  ChevronDown, ChevronUp, Sparkles, Award, X, CornerDownRight, Plus
} from 'lucide-react';

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

export const NewsView: React.FC = () => {
  const { news, rateNews, addNewsComment, addNews } = useStreaming();
  
  // Track expanded state for news articles
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const currentUserId = getOrCreateUserId();

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

  const toggleExpand = (id: string) => {
    setCommentError('');
    setCommentText('');
    setReplyTo(null);
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleReplyClick = (comment: any, newsId: string) => {
    const parentId = comment.parentId || comment.id;
    setReplyTo({ commentId: parentId, author: comment.author });
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

    try {
      await addNews({
        title: trimmedTitle,
        tag: trimmedTag.toUpperCase(),
        content: trimmedContent,
        date: new Date().toISOString()
      });
      
      setFormSuccess('Новость успешно опубликована!');
      setNewsTitle('');
      setNewsTag('');
      setNewsContent('');
      
      setTimeout(() => {
        setShowWriteForm(false);
        setFormSuccess('');
      }, 2000);
    } catch (err) {
      console.error(err);
      setFormError('Не удалось опубликовать новость.');
    }
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
      
      {/* 1. HERO BANNER & STATS */}
      <div className="relative rounded-[32px] overflow-hidden border border-border-color bg-bg-card p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center justify-between shadow-soft">
        <div className="absolute inset-0 z-0">
          <div className="w-full h-full bg-gradient-to-tr from-accent-light via-bg-card/50 to-bg-card opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-bg-card/85 to-transparent" />
        </div>

        <div className="relative z-10 space-y-3 flex-1 text-center md:text-left w-full">
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-accent-light text-accent-color border border-accent-color/20 flex items-center gap-1 w-fit mx-auto md:mx-0">
            <Newspaper className="w-3.5 h-3.5" />
            <span>Раздел новостей</span>
          </span>
          <h1 className="text-2xl md:text-4xl font-extrabold text-text-primary tracking-tight">
            Новости Сообщества <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent-color to-accent-hover">Pisulka Squad</span>
          </h1>
          <p className="text-xs md:text-sm text-text-secondary leading-relaxed max-w-xl">
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
              <p className="text-[10px] text-text-secondary font-sans leading-relaxed">Любой участник Pisulka Squad может опубликовать новость для всех.</p>
            </div>
          </div>
          <button
            onClick={() => {
              setFormError('');
              setFormSuccess('');
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

            <div className="flex justify-between items-center pt-2">
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

      {/* 2. NEWS LIST */}
      <div className="space-y-4">
        {news.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-border-color p-12 text-center space-y-4 bg-bg-card shadow-soft">
            <Newspaper className="w-12 h-12 text-text-muted mx-auto animate-pulse" />
            <h2 className="text-lg font-bold text-text-primary">Новостей пока нет</h2>
            <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
              Администратор еще не опубликовал никаких новостей. Загляните сюда позже!
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {news.map((item, index) => {
              const isExpanded = expandedId === item.id;
              const { average, count } = getNewsAverageRating(item.ratings);
              const userRating = item.ratings?.[currentUserId] || 0;

              return (
                <div 
                  key={item.id} 
                  className={`bg-bg-card border border-border-color rounded-3xl p-5 md:p-6 transition-all duration-300 shadow-soft hover:shadow-hover relative overflow-hidden ${
                    isExpanded ? 'border-accent-color/30 scale-[1.002]' : 'hover:border-accent-color/20'
                  }`}
                >
                  {/* Decorative rating-based glow for Top news */}
                  {index === 0 && average >= 4.0 && (
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-accent-color/10 to-transparent pointer-events-none rounded-bl-full" />
                  )}

                  <div className="space-y-4">
                    {/* Header info */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-color pb-3 select-none">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono font-bold text-accent-color bg-accent-light px-2.5 py-0.5 rounded-lg border border-accent-color/20 uppercase tracking-wider">
                          {item.tag}
                        </span>
                        
                        {index === 0 && average >= 4.0 && (
                          <span className="text-[9px] font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-lg border border-yellow-500/20 flex items-center gap-0.5 uppercase tracking-wider">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>В топе</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-[10px] text-text-muted font-mono">
                        {/* Rating Display */}
                        <div className="flex items-center gap-1 text-yellow-500 font-bold bg-bg-app border border-border-color/50 px-2.5 py-0.5 rounded-lg">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{count > 0 ? average : '0.0'}</span>
                          <span className="text-[8px] text-text-muted font-normal">({count})</span>
                        </div>

                        {/* Comments Count display */}
                        <div className="flex items-center gap-1 text-accent-color font-bold bg-bg-app border border-border-color/50 px-2.5 py-0.5 rounded-lg">
                          <MessageSquare className="w-3 h-3" />
                          <span>{item.comments?.length || 0}</span>
                        </div>

                        <span className="flex items-center gap-1 text-text-muted font-sans">
                          <Calendar className="w-3 h-3" />
                          <span>{formatNewsDate(item.date)}</span>
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm md:text-base font-extrabold text-text-primary tracking-tight">
                      {item.title}
                    </h3>

                    {/* Content (Conditional truncate) */}
                    <p className={`text-xs text-text-secondary leading-relaxed whitespace-pre-wrap break-words transition-all duration-300 font-sans ${
                      isExpanded ? '' : 'line-clamp-2'
                    }`}>
                      {item.content}
                    </p>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className={`text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer bg-bg-app border border-border-color/60 hover:border-accent-color/30 px-4 py-2 rounded-xl text-text-secondary hover:text-text-primary ${
                          isExpanded ? 'text-accent-color border-accent-color/25' : ''
                        }`}
                      >
                        <span>{isExpanded ? 'Свернуть новость' : 'Читать полностью'}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {/* Floating mini rating widget when expanded is false */}
                      {!isExpanded && (
                        <div className="flex items-center gap-0.5 select-none">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                rateNews(item.id, star);
                              }}
                              className={`text-[12px] focus:outline-none transition-all hover:scale-125 cursor-pointer ${
                                star <= userRating ? 'text-yellow-500 font-bold' : 'text-text-muted hover:text-yellow-500'
                              }`}
                              title={`Оценить на ${star}`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Expanded details: Interactive rating widget & Comments section */}
                    {isExpanded && (
                      <div className="mt-6 pt-6 border-t border-border-color space-y-6 animate-[fadeIn_0.25s_ease-out]">
                        
                        {/* 2.1 Interactive Rating Section */}
                        <div className="bg-bg-app border border-border-color/70 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm select-none">
                          <div className="space-y-1 text-center sm:text-left">
                            <h4 className="text-xs font-bold text-text-primary flex items-center justify-center sm:justify-start gap-1 font-mono uppercase tracking-wider">
                              <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                              <span>Оцените эту новость</span>
                            </h4>
                            <p className="text-[10px] text-text-secondary">Ваша оценка поможет отсортировать важные новости выше в ленте.</p>
                          </div>

                          <div className="flex items-center gap-4 bg-bg-card border border-border-color px-4 py-2 rounded-xl shadow-soft">
                            <div className="flex items-center gap-1 font-mono text-yellow-500 font-bold text-xs shrink-0 pr-3 border-r border-border-color">
                              <span>★ {count > 0 ? average : '0.0'}</span>
                              <span className="text-[9px] text-text-muted font-normal">({count} голосов)</span>
                            </div>

                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => {
                                const isHighlighted = star <= userRating;
                                return (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => rateNews(item.id, star)}
                                    className={`text-[15px] focus:outline-none transition-all hover:scale-125 cursor-pointer ${
                                      isHighlighted 
                                        ? 'text-yellow-500 font-bold filter drop-shadow-[0_0_3px_rgba(234,179,8,0.4)]' 
                                        : 'text-text-muted hover:text-yellow-500'
                                    }`}
                                    title={`Оценить на ${star}`}
                                  >
                                    ★
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* 2.2 Comments Section */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5 font-mono uppercase tracking-wider border-b border-border-color pb-2">
                            <MessageSquare className="w-3.5 h-3.5 text-accent-color" />
                            <span>Комментарии к новости ({item.comments?.length || 0})</span>
                          </h4>

                          {/* Comment input form */}
                          <form onSubmit={(e) => handleSubmitComment(e, item.id)} className="space-y-3 bg-bg-app border border-border-color p-4 rounded-2xl shadow-soft">
                            <div className="flex flex-col md:flex-row gap-3">
                              <div className="w-full md:w-1/4 font-sans">
                                <label htmlFor={`nickname-${item.id}`} className="block text-[9px] font-bold text-text-secondary uppercase tracking-wider mb-1.5 font-mono">
                                  Ваш псевдоним
                                </label>
                                <input
                                  id={`nickname-${item.id}`}
                                  type="text"
                                  value={nickname}
                                  onChange={(e) => setNickname(e.target.value)}
                                  placeholder="Введите никнейм..."
                                  className="w-full bg-bg-card border border-border-color rounded-xl px-3 py-2.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-color/50 focus:ring-1 focus:ring-accent-color/40 transition-all font-sans"
                                  maxLength={25}
                                />
                              </div>
                              
                              <div className="flex-1 font-sans space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <label htmlFor={`comment-${item.id}`} className="block text-[9px] font-bold text-text-secondary uppercase tracking-wider font-mono">
                                    Комментарий
                                  </label>
                                  
                                  {replyTo && (
                                    <div className="flex items-center gap-1.5 bg-accent-light border border-accent-color/15 px-2 py-0.5 rounded-lg text-[9px] font-bold text-accent-color animate-[fadeIn_0.15s_ease-out]">
                                      <span>Ответ @{replyTo.author}</span>
                                      <button
                                        type="button"
                                        onClick={() => setReplyTo(null)}
                                        className="text-accent-color hover:text-accent-hover p-0.5 rounded transition-colors cursor-pointer"
                                        title="Отменить ответ"
                                      >
                                        <X className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                
                                <textarea
                                  id={`comment-${item.id}`}
                                  rows={2}
                                  value={commentText}
                                  onChange={(e) => setCommentText(e.target.value)}
                                  placeholder={replyTo ? `Напишите ответ для @${replyTo.author}...` : "Напишите комментарий..."}
                                  className="w-full bg-bg-card border border-border-color rounded-xl px-3 py-2.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-color/50 focus:ring-1 focus:ring-accent-color/40 transition-all resize-none font-sans"
                                  maxLength={500}
                                />
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center mt-2 font-sans">
                              <div>
                                {commentError && <span className="text-[10px] text-rose-500 font-semibold">{commentError}</span>}
                              </div>
                              <button
                                type="submit"
                                className="bg-accent-color hover:bg-accent-hover text-white rounded-xl px-4 py-2 flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-soft active:scale-95 self-end"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Отправить</span>
                              </button>
                            </div>
                          </form>

                          {/* Comments list */}
                          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                            {!item.comments || item.comments.length === 0 ? (
                              <div className="text-center py-6 border border-dashed border-border-color rounded-2xl bg-bg-app text-text-muted text-xs font-sans shadow-soft">
                                Комментариев пока нет. Напишите первый отзыв!
                              </div>
                            ) : (
                              (() => {
                                const allComments = item.comments || [];
                                const parentComments = allComments
                                  .filter(c => !c.parentId)
                                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                                const replyComments = allComments
                                  .filter(c => c.parentId)
                                  .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                                return parentComments.map((parent) => {
                                  const isParentOwner = parent.userId === currentUserId;
                                  const parentGradient = getAvatarGradient(parent.author);
                                  const parentInitials = getInitials(parent.author);
                                  const replies = replyComments.filter(r => r.parentId === parent.id);

                                  return (
                                    <div key={parent.id} className="space-y-3">
                                      {/* Parent Comment Card */}
                                      <div className="flex gap-3 bg-bg-app border border-border-color rounded-2xl p-3.5 hover:border-accent-color/20 transition-all group font-sans shadow-soft">
                                        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${parentGradient} text-white font-bold flex items-center justify-center text-[9px] shrink-0 uppercase tracking-wider`}>
                                          {parentInitials}
                                        </div>

                                        <div className="flex-1 min-w-0 space-y-1">
                                          <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-baseline gap-1.5">
                                              <span className="text-xs font-bold text-text-primary truncate">{parent.author}</span>
                                              {isParentOwner && (
                                                <span className="text-[8px] px-1 py-0.2 rounded bg-accent-light text-accent-color border border-accent-color/10 font-semibold font-mono">
                                                  Вы
                                                </span>
                                              )}
                                            </div>
                                            <span className="text-[8px] text-text-muted font-mono shrink-0">
                                              {formatCommentDate(parent.createdAt)}
                                            </span>
                                          </div>
                                          <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap break-words select-text font-sans">
                                            {parent.text}
                                          </p>
                                          
                                          <button
                                            type="button"
                                            onClick={() => handleReplyClick(parent, item.id)}
                                            className="text-[9px] font-bold text-accent-color hover:underline cursor-pointer pt-1 flex items-center gap-0.5"
                                          >
                                            Ответить
                                          </button>
                                        </div>
                                      </div>

                                      {/* Nested Replies */}
                                      {replies.length > 0 && (
                                        <div className="pl-6 border-l-2 border-accent-color/10 ml-4 space-y-3 mt-3 animate-[fadeIn_0.2s_ease-out]">
                                          {replies.map((reply) => {
                                            const isReplyOwner = reply.userId === currentUserId;
                                            const replyGradient = getAvatarGradient(reply.author);
                                            const replyInitials = getInitials(reply.author);

                                            return (
                                              <div 
                                                key={reply.id}
                                                className="flex gap-2.5 bg-bg-app/50 border border-border-color/70 rounded-xl p-3 hover:border-accent-color/15 transition-all group font-sans shadow-sm"
                                              >
                                                <div className={`w-6.5 h-6.5 rounded-full bg-gradient-to-br ${replyGradient} text-white font-bold flex items-center justify-center text-[8px] shrink-0 uppercase tracking-wider`}>
                                                  {replyInitials}
                                                </div>

                                                <div className="flex-1 min-w-0 space-y-1">
                                                  <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-baseline gap-1.5 flex-wrap">
                                                      <span className="text-xs font-bold text-text-primary truncate">{reply.author}</span>
                                                      {isReplyOwner && (
                                                        <span className="text-[8px] px-1 py-0.2 rounded bg-accent-light text-accent-color border border-accent-color/10 font-semibold font-mono">
                                                          Вы
                                                        </span>
                                                      )}
                                                      <span className="text-[9px] text-accent-color font-bold flex items-center gap-0.5 font-sans">
                                                        <CornerDownRight className="w-2.5 h-2.5 text-accent-color/50" />
                                                        <span>ответил @{reply.replyToAuthor}</span>
                                                      </span>
                                                    </div>
                                                    <span className="text-[8px] text-text-muted font-mono shrink-0">
                                                      {formatCommentDate(reply.createdAt)}
                                                    </span>
                                                  </div>
                                                  <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap break-words select-text font-sans">
                                                    {reply.text}
                                                  </p>
                                                  
                                                  <button
                                                    type="button"
                                                    onClick={() => handleReplyClick(reply, item.id)}
                                                    className="text-[9px] font-bold text-accent-color hover:underline cursor-pointer pt-1 flex items-center gap-0.5"
                                                  >
                                                    Ответить
                                                  </button>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                });
                              })()
                            )}
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
