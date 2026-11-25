'use strict';
// ---------- i18n: ru, tr, остальные языки → en; недостающий ключ ищется в en, потом в ru ----------
const STR = {
  ru: {
    'hint.kitchen': 'Подожди замаха ножа и прыгай на середину доски.',
    'hint.fridge': 'Лёд несёт вперёд. Дрожит сосулька — уходи в сторону.',
    'hint.oven': 'Полки нагреваются. Перепрыгивай струю пара.',
    'hint.cellar': 'Ищи светящиеся глаза. Из жвачки выручит второй тап.',
    'hint.feast': 'Еды вдвое больше. Заденешь перчик — отпрыгивай.',
    'die.icicle': 'Сосулька',
    'die.steam': 'Струя пара',
    'die.rat': 'Крыса',
    'die.pepper': 'Взрыв перчика',
    'die.heat': 'Горячая платформа',
    'mod.heat': 'Жара',
    'mod.ice': 'Гололёд',
    'mod.swarm': 'Рой мух',
    'mod.sharp': 'Острые ножи',
    'mod.narrow': 'Тесно',
    'mod.feast': 'Пир',
    'mod.dark': 'Темнота',
    'mod.fragile': 'Хрупко',

    title: 'Тефтеля', tower: 'Башня', play: 'Играть', 'theme.kitchen': 'Кухня', 'theme.fridge': 'Холодильник', 'theme.oven': 'Духовка', 'theme.cellar': 'Погреб', 'theme.feast': 'Пиршественный зал', roof: 'Крыша',
    hint1: 'Тап — прыжок в точку тапа.', hint2: 'Еда заряжает силу. Полная шкала — жми на молнию внизу.', hint3: 'Сковородка жжёт, мухи кусают, масло льют сверху.',
    fell: 'Шлёп!', runCoins: 'Собрано за забег', total: 'Всего',
    continueAd: 'Продолжить', doubleAd: 'Монеты ×2', forAd: 'за рекламу', fromCp: 'С чекпоинта', restart: 'Заново', next: 'Следующая башня',
    paused: 'Пауза', tapToContinue: 'Тапни, чтобы продолжить', adStub: 'Реклама (заглушка)', loading: 'Загрузка…',
    towerDone: 'Башня {n} пройдена!', rating: 'Рейтинг', 'chk.noDeath': 'Без смертей', 'chk.time': 'Время', 'chk.food': 'Еда', bonus: 'Награда',
    tapBolt: 'Жми на молнию!', berserk: 'Берсерк!', checkpoint: 'Чекпоинт {n}', floorMark: 'Этаж {n}', flyGone: 'отстала',
    'die.fall': 'В пропасть!', 'die.fly': 'Укус мухи', 'die.blades': 'Лопасти', 'die.pan': 'Ожог на сковородке', 'die.oil': 'Горячее масло', 'die.knife': 'Нож',
  },
  en: {
    'hint.kitchen': 'Watch the knife, then aim for the middle of the board.',
    'hint.fridge': 'Ice carries you forward. Move away from shaking icicles.',
    'hint.oven': 'Surfaces heat up. Jump over the steam jet.',
    'hint.cellar': 'Look for glowing eyes. Tap twice to jump from gum.',
    'hint.feast': 'Twice the food. Brush a pepper and jump clear.',
    'die.icicle': 'Falling icicle',
    'die.steam': 'Steam jet',
    'die.rat': 'Rat bite',
    'die.pepper': 'Pepper blast',
    'die.heat': 'Hot platform',
    'mod.heat': 'Heat',
    'mod.ice': 'Black ice',
    'mod.swarm': 'Fly swarm',
    'mod.sharp': 'Sharp knives',
    'mod.narrow': 'Narrow ledges',
    'mod.feast': 'Feast',
    'mod.dark': 'Darkness',
    'mod.fragile': 'Fragile',

    title: 'Meatball', tower: 'Tower', play: 'Play', 'theme.kitchen': 'Kitchen', 'theme.fridge': 'Fridge', 'theme.oven': 'Oven', 'theme.cellar': 'Cellar', 'theme.feast': 'Banquet hall', roof: 'Roof',
    hint1: 'Tap where you want to land.', hint2: 'Food charges your power. Full bar — hit the bolt below.', hint3: 'Pans burn, flies bite, oil pours from above.',
    fell: 'Splat!', runCoins: 'Coins this run', total: 'Total',
    continueAd: 'Continue', doubleAd: 'Coins ×2', forAd: 'watch ad', fromCp: 'From checkpoint', restart: 'Restart', next: 'Next tower',
    paused: 'Paused', tapToContinue: 'Tap to continue', adStub: 'Ad (stub)', loading: 'Loading…',
    towerDone: 'Tower {n} cleared!', rating: 'Rating', 'chk.noDeath': 'No deaths', 'chk.time': 'Time', 'chk.food': 'Food', bonus: 'Reward',
    tapBolt: 'Hit the bolt!', berserk: 'Berserk!', checkpoint: 'Checkpoint {n}', floorMark: 'Floor {n}', flyGone: 'gave up',
    'die.fall': 'Into the void!', 'die.fly': 'Fly bite', 'die.blades': 'Blades', 'die.pan': 'Burnt on the pan', 'die.oil': 'Hot oil', 'die.knife': 'Knife',
  },
  tr: {
    'hint.kitchen': 'Bıçağı izle, sonra tahtanın ortasına atla.',
    'hint.fridge': 'Buzda kayarsın. Sallanan buz sarkıtından uzaklaş.',
    'hint.oven': 'Yüzeyler ısınır. Buhar jetinin üzerinden atla.',
    'hint.cellar': 'Parlayan gözleri izle. Sakızdan atlamak için iki kez dokun.',
    'hint.feast': 'İki kat yemek var. Bibere değersen hemen uzaklaş.',
    'die.icicle': 'Buz sarkıtı',
    'die.steam': 'Buhar jeti',
    'die.rat': 'Sıçan ısırığı',
    'die.pepper': 'Biber patlaması',
    'die.heat': 'Sıcak platform',
    'mod.heat': 'Sıcak',
    'mod.ice': 'Buz',
    'mod.swarm': 'Sinek sürüsü',
    'mod.sharp': 'Keskin bıçaklar',
    'mod.narrow': 'Dar raflar',
    'mod.feast': 'Ziyafet',
    'mod.dark': 'Karanlık',
    'mod.fragile': 'Kırılgan',

    title: 'Köfte', tower: 'Kule', play: 'Oyna', 'theme.kitchen': 'Mutfak', 'theme.fridge': 'Buzdolabı', 'theme.oven': 'Fırın', 'theme.cellar': 'Kiler', 'theme.feast': 'Ziyafet salonu', roof: 'Çatı',
    hint1: 'İnmek istediğin yere dokun.', hint2: 'Yemek gücü doldurur. Çubuk dolunca aşağıdaki şimşeğe dokun.', hint3: 'Tava yakar, sinek ısırır, yukarıdan yağ dökülür.',
    fell: 'Pat!', runCoins: 'Bu turda toplanan', total: 'Toplam',
    continueAd: 'Devam et', doubleAd: 'Para ×2', forAd: 'reklam izle', fromCp: 'Kontrol noktasından', restart: 'Baştan', next: 'Sonraki kule',
    paused: 'Duraklatıldı', tapToContinue: 'Devam etmek için dokun', adStub: 'Reklam (taslak)', loading: 'Yükleniyor…',
    towerDone: 'Kule {n} geçildi!', rating: 'Derece', 'chk.noDeath': 'Ölümsüz', 'chk.time': 'Süre', 'chk.food': 'Yemek', bonus: 'Ödül',
    tapBolt: 'Şimşeğe dokun!', berserk: 'Çılgınlık!', checkpoint: 'Kontrol noktası {n}', floorMark: 'Kat {n}', flyGone: 'vazgeçti',
    'die.fall': 'Boşluğa!', 'die.fly': 'Sinek ısırığı', 'die.blades': 'Bıçaklar', 'die.pan': 'Tavada yanık', 'die.oil': 'Kızgın yağ', 'die.knife': 'Bıçak',
  },
};
function langFor(code) { const c = String(code || '').slice(0, 2).toLowerCase(); return c === 'ru' ? 'ru' : c === 'tr' ? 'tr' : 'en'; }
// до YG.init()/setLang язык берём из браузера, чтобы «Загрузка…» не всегда была русской
let LANG = langFor((window.navigator && window.navigator.language) || 'ru');
function setLang(code) { LANG = langFor(code); }
// T(key) — строка; T(key, n) — с подстановкой {n} (число) или {s} (строка)
function T(key, n) {
  for (const tbl of [STR[LANG], STR.en, STR.ru]) {
    const t = tbl[key];
    if (t !== undefined) return n === undefined ? t : t.replace('{n}', String(n)).replace('{s}', String(n));
  }
  return key;
}
expose({ setLang, T, get lang() { return LANG; } });
