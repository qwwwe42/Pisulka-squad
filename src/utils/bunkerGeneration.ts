import type { BunkerContentPack, PlayerTraits, SpecialActionItem, PackItem } from '../types/bunker';

export const BASE_PACK: BunkerContentPack = {
  id: 'base',
  name: 'Базовый набор',
  description: 'Стандартный набор характеристик для бесплатной игры',
  requiredRole: 'guest',
  content: {
    professions: [
      { id: 'p1', text: 'Врач-хирург (стаж 10 лет)' },
      { id: 'p2', text: 'Программист (стаж 5 лет)' },
      { id: 'p3', text: 'Фермер (стаж 20 лет)' },
      { id: 'p4', text: 'Полицейский (стаж 8 лет)' },
      { id: 'p5', text: 'Учитель биологии (стаж 15 лет)' },
      { id: 'p6', text: 'Строитель (стаж 12 лет)' },
      { id: 'p7', text: 'Повар (стаж 6 лет)' },
      { id: 'p8', text: 'Военный снайпер (стаж 10 лет)' },
      { id: 'p9', text: 'Электрик (стаж 20 лет)' },
      { id: 'p10', text: 'Психолог (стаж 4 года)' },
      { id: 'p11', text: 'Инженер-механик (стаж 18 лет)' },
      { id: 'p12', text: 'Агроном (стаж 9 лет)' },
    ],
    biology: [], // Generated dynamically
    health: [
      { id: 'h1', text: 'Идеально здоров' },
      { id: 'h2', text: 'Идеально здоров' },
      { id: 'h3', text: 'Астма (средняя степень, нужен ингалятор)' },
      { id: 'h4', text: 'Сахарный диабет (инсулинозависимый)' },
      { id: 'h5', text: 'Хронический бронхит' },
      { id: 'h6', text: 'Рак легких (критическая стадия, жить 1 год)' },
      { id: 'h7', text: 'Легкая близорукость' },
      { id: 'h8', text: 'ВИЧ (принимает терапию)' },
    ],
    hobbies: [
      { id: 'ho1', text: 'Охота' },
      { id: 'ho2', text: 'Рыбалка' },
      { id: 'ho3', text: 'Вязание' },
      { id: 'ho4', text: 'Радиолюбитель' },
      { id: 'ho5', text: 'Выживание в лесу' },
      { id: 'ho6', text: 'Настольные игры' },
      { id: 'ho7', text: 'Сборка мебели' },
      { id: 'ho8', text: 'Садоводство' },
    ],
    phobias: [
      { id: 'ph1', text: 'Нет фобий' },
      { id: 'ph2', text: 'Клаустрофобия (боязнь замкнутых пространств)' },
      { id: 'ph3', text: 'Никтофобия (боязнь темноты)' },
      { id: 'ph4', text: 'Гемофобия (боязнь крови)' },
      { id: 'ph5', text: 'Арахнофобия (боязнь пауков)' },
      { id: 'ph6', text: 'Аквафобия (боязнь воды)' },
    ],
    inventory: [
      { id: 'i1', text: 'Аптечка первой помощи' },
      { id: 'i2', text: 'Швейцарский нож' },
      { id: 'i3', text: 'Фонарик с динамо-машиной' },
      { id: 'i4', text: 'Ящик тушенки (30 банок)' },
      { id: 'i5', text: 'Набор семян овощей' },
      { id: 'i6', text: 'Рация' },
      { id: 'i7', text: 'Набор строительных инструментов' },
      { id: 'i8', text: 'Бутылка виски' },
    ],
    characters: [
      { id: 'c1', text: 'Лидер, берет инициативу' },
      { id: 'c2', text: 'Паникер, легко срывается' },
      { id: 'c3', text: 'Эгоист, думает только о себе' },
      { id: 'c4', text: 'Альтруист, готов пожертвовать собой' },
      { id: 'c5', text: 'Душа компании, умеет разрядить обстановку' },
      { id: 'c6', text: 'Скрытный, мало говорит' },
    ],
    facts: [
      { id: 'f1', text: 'Знает расположение секретного военного склада' },
      { id: 'f2', text: 'Был судим за мелкую кражу' },
      { id: 'f3', text: 'Имеет иммунитет к радиации' },
      { id: 'f4', text: 'Чемпион области по легкой атлетике' },
      { id: 'f5', text: 'Имеет скрытую зависимость от антидепрессантов' },
      { id: 'f6', text: 'Умеет управлять легким самолетом' },
    ],
    specialActions: [
      { id: 'sa1', text: 'Кража', description: 'Забрать один предмет инвентаря у любого игрока.' },
      { id: 'sa2', text: 'Исцеление', description: 'Вылечить любую некритическую болезнь у одного игрока (или себя).' },
      { id: 'sa3', text: 'Смена', description: 'Поменять любую свою нераскрытую карту на новую случайную.' },
      { id: 'sa4', text: 'Иммунитет', description: 'Нельзя выгнать на текущем голосовании.' },
    ],
    cataclysms: [
      { title: 'Ядерная зима', description: 'Обмен ядерными ударами уничтожил большинство городов. Температура упала на 30 градусов. Радиация на поверхности смертельна. Воздух отравлен пеплом.' },
      { title: 'Зомби-вирус', description: 'Агрессивный вирус бешенства передается через укус. На поверхности бродят толпы зараженных. Вирус мутирует каждые 3 месяца.' },
      { title: 'Падение метеорита', description: 'Гигантский астероид вызвал цунами и землетрясения по всему миру. Пыль закрыла солнце, остановив фотосинтез.' },
    ]
  }
};

// Пак для MVP-пользователей
export const EXTENDED_PACK_1: BunkerContentPack = {
  id: 'extended_1',
  name: 'Безумие (MVP)',
  description: 'Добавляет сумасшедшие профессии, жесткие болезни и неожиданные факты.',
  requiredRole: 'mvp',
  content: {
    professions: [
      { id: 'p_e1', text: 'Таролог (стаж 2 года)' },
      { id: 'p_e2', text: 'Клоун (стаж 10 лет)' },
      { id: 'p_e3', text: 'Тиктокер (миллион подписчиков)' },
    ],
    biology: [],
    health: [
      { id: 'h_e1', text: 'Биполярное расстройство' },
      { id: 'h_e2', text: 'Аллергия на мясо' },
    ],
    hobbies: [
      { id: 'ho_e1', text: 'Коллекционирование бабочек' },
      { id: 'ho_e2', text: 'Просмотр аниме 24/7' },
    ],
    phobias: [
      { id: 'ph_e1', text: 'Коулрофобия (боязнь клоунов)' },
    ],
    inventory: [
      { id: 'i_e1', text: 'Коллекция карточек Покемонов' },
      { id: 'i_e2', text: 'Костюм Бэтмена' },
    ],
    characters: [
      { id: 'c_e1', text: 'Постоянно врет без причины' },
    ],
    facts: [
      { id: 'f_e1', text: 'Верит в плоскую землю и может убедить других' },
    ],
    specialActions: [
      { id: 'sa_e1', text: 'Саботаж', description: 'Сломать один случайный предмет в бункере (снижает шансы на выживание).' },
    ],
    cataclysms: [
      { title: 'Восстание машин', description: 'Искусственный интеллект захватил контроль над всей электроникой и дронами. Человечество почти истреблено.' },
    ]
  }
};

export const AVAILABLE_PACKS = [BASE_PACK, EXTENDED_PACK_1];

const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const generateBiology = (): string => {
  const isMale = Math.random() > 0.5;
  const age = Math.floor(Math.random() * (70 - 18 + 1)) + 18;
  const sex = isMale ? 'Мужчина' : 'Женщина';
  
  let childStatus = 'может иметь детей';
  if (age > 55 && !isMale) childStatus = 'не может иметь детей (возраст)';
  else if (Math.random() > 0.8) childStatus = 'чайлдфри (бесплоден/на)';
  
  return `${sex}, ${age} лет, ${childStatus}`;
};

export const generatePlayerTraits = (enabledPackIds: string[] = ['base']): PlayerTraits => {
  const enabledPacks = AVAILABLE_PACKS.filter(p => enabledPackIds.includes(p.id));
  if (enabledPacks.length === 0) enabledPacks.push(BASE_PACK);

  const pool = {
    professions: [] as PackItem[],
    health: [] as PackItem[],
    hobbies: [] as PackItem[],
    phobias: [] as PackItem[],
    inventory: [] as PackItem[],
    characters: [] as PackItem[],
    facts: [] as PackItem[],
    specialActions: [] as SpecialActionItem[],
  };

  enabledPacks.forEach(pack => {
    pool.professions.push(...pack.content.professions);
    pool.health.push(...pack.content.health);
    pool.hobbies.push(...pack.content.hobbies);
    pool.phobias.push(...pack.content.phobias);
    pool.inventory.push(...pack.content.inventory);
    pool.characters.push(...pack.content.characters);
    pool.facts.push(...pack.content.facts);
    pool.specialActions.push(...pack.content.specialActions);
  });

  return {
    profession: getRandomItem(pool.professions).text,
    biology: generateBiology(),
    health: getRandomItem(pool.health).text,
    hobby: getRandomItem(pool.hobbies).text,
    phobia: getRandomItem(pool.phobias).text,
    inventory: [getRandomItem(pool.inventory).text], // 1 random item
    character: getRandomItem(pool.characters).text,
    fact: getRandomItem(pool.facts).text,
    specialAction: {
      ...getRandomItem(pool.specialActions),
      isUsed: false
    }
  };
};

export const generateGameInfo = (capacity: number, enabledPackIds: string[] = ['base']) => {
  const enabledPacks = AVAILABLE_PACKS.filter(p => enabledPackIds.includes(p.id));
  if (enabledPacks.length === 0) enabledPacks.push(BASE_PACK);
  
  const cataclysms = enabledPacks.flatMap(p => p.content.cataclysms);
  const cataclysm = getRandomItem(cataclysms);
  
  return {
    cataclysm,
    bunkerInfo: {
      size: capacity,
      description: `Площадь: ${capacity * 15} кв.м. Включает систему вентиляции, генератор воды, гидропонику и запас консервов на 3 года. Рассчитан строго на ${capacity} человек.`
    }
  };
};
