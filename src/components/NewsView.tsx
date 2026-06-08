import React, { useState, useEffect, useCallback } from 'react';
import { useStreaming, getNewsAverageRating, getOrCreateUserId } from '../context/StreamingContext';
import type { Comment } from '../types/streaming';
import { 
  Newspaper, Star, MessageSquare, Send, Calendar, 
  Award, X, CornerDownRight, Plus
} from 'lucide-react';
import { ImageUploader } from './ImageUploader';

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

export const NewsView: React.FC = () => {
  const { news, rateNews, addNewsComment, addNews } = useStreaming();
  
  // Track selected news article for full view
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);

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

    try {
      await addNews({
        title: trimmedTitle,
        tag: trimmedTag.toUpperCase(),
        content: trimmedContent,
        imageUrl: newsImage || undefined,
        date: new Date().toISOString()
      });
      
      setFormSuccess('Новость успешно опубликована!');
      setNewsTitle('');
      setNewsTag('');
      setNewsContent('');
      setNewsImage('');
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
              onClick={() => handleReplyClick(comment, selectedNewsId || '')}
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
    if (!selectedNewsId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [selectedNewsId]);

  // ── Esc key closes the overlay ────────────────────────────────────────────
  const closeOverlay = useCallback(() => {
    setSelectedNewsId(null);
    setCommentError('');
    setCommentText('');
    setReplyTo(null);
  }, []);

  useEffect(() => {
    if (!selectedNewsId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeOverlay(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedNewsId, closeOverlay]);

  // ── Compute article data for the overlay ─────────────────────────────────
  const selectedArticle = selectedNewsId ? news.find(n => n.id === selectedNewsId) ?? null : null;
  const articleRating = selectedArticle ? getNewsAverageRating(selectedArticle.ratings) : { average: '0.0', count: 0 };
  const userRating = selectedArticle ? (selectedArticle.ratings?.[currentUserId] || 0) : 0;
  const commentTree = selectedArticle ? buildCommentTree(selectedArticle.comments || []) : [];

  // ── Render general feed layout (Hero, stats, list/grid) ──────────────────
  return (
    <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
      
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
            Новости Сообщества <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent-color to-accent-hover">Pisulka Squad</span>
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
              <p className="text-[10px] text-text-secondary font-sans leading-relaxed">Любой участник Pisulka Squad может опубликовать новость для всех.</p>
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
        {news.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-border-color p-12 text-center space-y-4 bg-bg-card shadow-soft font-sans">
            <Newspaper className="w-12 h-12 text-text-muted mx-auto animate-pulse" />
            <h2 className="text-lg font-bold text-text-primary">Новостей пока нет</h2>
            <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
              Администратор еще не опубликовал никаких новостей. Загляните сюда позже!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
            {news.map((item) => {
              const { average } = getNewsAverageRating(item.ratings);
              return (
                <div 
                  key={item.id} 
                  onClick={() => setSelectedNewsId(item.id)}
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
                    ) : (
                      // Placeholder when image is missing
                      <div className="w-full h-full bg-gradient-to-tr from-accent-light/40 to-bg-card flex flex-col items-center justify-center gap-2 text-text-muted select-none">
                        <Newspaper className="w-8 h-8 opacity-45 group-hover:scale-110 transition-transform duration-300" />
                        <span className="text-[10px] font-bold tracking-wider font-mono">PISULKA SQUAD</span>
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
      {selectedNewsId && (
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

                {/* Full-width hero image */}
                {selectedArticle.imageUrl && (
                  <div className="w-full bg-bg-app border-b border-border-color/60 max-h-[420px] flex items-center justify-center overflow-hidden">
                    <img
                      src={selectedArticle.imageUrl}
                      alt={selectedArticle.title}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

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
