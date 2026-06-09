import type { BunkerPools, PlayerTraits } from '../types/bunker';
import { defaultBunkerPools } from './bunkerDefaultPools';

const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const generateGender = (): string => {
  const isMale = Math.random() > 0.5;
  const age = Math.floor(Math.random() * (85 - 16 + 1)) + 16;
  const sex = isMale ? 'Мужчина' : 'Женщина';
  
  let group = '';
  if (age <= 34) group = 'Молодой';
  else if (age <= 59) group = 'Взрослый';
  else group = 'Пожилой';

  let childStatus = '';
  if (age > 50 && !isMale) {
    childStatus = 'не может иметь детей (возраст)';
  } else if (age >= 60) {
    childStatus = 'детей иметь не может';
  } else if (Math.random() > 0.8) {
    childStatus = 'чайлдфри';
  } else {
    childStatus = 'может иметь детей';
  }
  
  return `${sex}, ${age} лет (${group}), ${childStatus}`;
};

export const PHYSIQUES = [
  'Хрупкое', 'Худое', 'Крепкое', 'Атлетическое', 
  'Полное', 'Слабое ожирение', 'Сильное ожирение'
];

export const generatePhysique = (): string => {
  return getRandomItem(PHYSIQUES);
};

export const generateHealth = (pools: BunkerPools): string => {
  if (Math.random() > 0.85) return 'Идеально здоров';
  const disease = getRandomItem(pools.diseases);
  const severities = ['Лёгкая', 'Средняя', 'Тяжёлая', 'Критическая'];
  const severity = getRandomItem(severities);
  return `${disease.name} (${disease.category}, система: ${disease.system}, ${severity} степень)`;
};

export const generateHobby = (pools: BunkerPools): string => {
  const levels = ['Новичок', 'Любитель', 'Опытный', 'Продвинутый', 'Мастер'];
  const level = getRandomItem(levels);
  const hobby = getRandomItem(pools.hobbies);
  return `${hobby.name} (${level})`;
};

export const generateProfession = (pools: BunkerPools): string => {
  const levels = ['Новичок', 'Стажёр', 'Любитель', 'Опытный', 'Профи'];
  const level = getRandomItem(levels);
  const prof = getRandomItem(pools.professions);
  return `${prof.name} (${level}) [${prof.ability}]`;
};

export const generatePlayerTraits = (pools: BunkerPools = defaultBunkerPools): PlayerTraits => {
  let sa1 = getRandomItem(pools.specialActions);
  let sa2 = getRandomItem(pools.specialActions);
  while(sa1.id === sa2.id && pools.specialActions.length > 1) {
    sa2 = getRandomItem(pools.specialActions);
  }

  return {
    gender: generateGender(),
    physique: generatePhysique(),
    humanTrait: getRandomItem(pools.humanTraits).text,
    profession: generateProfession(pools),
    health: generateHealth(pools),
    hobby: generateHobby(pools),
    phobia: getRandomItem(pools.phobias).text,
    largeInventory: getRandomItem(pools.largeInventory).text,
    backpack: getRandomItem(pools.backpack).text,
    additionalInfo: getRandomItem(pools.additionalInfo).text,
    specialAction1: { ...sa1, isUsed: false },
    specialAction2: { ...sa2, isUsed: false }
  };
};

export const generateGameInfo = () => {
  const cataclysms = [
    { title: 'Ядерная зима', description: 'Обмен ядерными ударами уничтожил большинство городов. Температура упала на 30 градусов. Радиация на поверхности смертельна. Воздух отравлен пеплом.' },
    { title: 'Зомби-вирус', description: 'Агрессивный вирус бешенства передается через укус. На поверхности бродят толпы зараженных. Вирус мутирует каждые 3 месяца.' },
    { title: 'Падение метеорита', description: 'Гигантский астероид вызвал цунами и землетрясения по всему миру. Пыль закрыла солнце, остановив фотосинтез.' },
    { title: 'Восстание машин', description: 'Искусственный интеллект захватил контроль над всей электроникой и дронами. Человечество почти истреблено.' }
  ];
  const cataclysm = getRandomItem(cataclysms);
  
  return {
    cataclysm,
    bunkerInfo: {
      size: Math.floor(Math.random() * (500 - 50 + 1)) + 50,
      description: `Укрепленное подземное убежище, способное автономно существовать несколько лет. Оснащено системами очистки воздуха и воды. Расположено на глубине 50 метров.`
    }
  };
};
