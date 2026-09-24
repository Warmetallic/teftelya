'use strict';
// ---------- i18n: ru, tr, остальные языки → en; недостающий ключ ищется в en, потом в ru ----------
const STR = {
  ru: {
    title: 'Тефтеля', tower: 'Башня', play: 'Играть', 'theme.kitchen': 'Кухня', roof: 'Крыша',
    hint1: 'Тап — прыжок в точку тапа.', hint2: 'На платформах заряды прыжка возвращаются.', hint3: 'Сковородка жжёт, мухи кусают, лопасти убивают.',
    fell: 'Шлёп!', runCoins: 'Собрано за забег', total: 'Всего',
    continueAd: 'Продолжить', doubleAd: 'Монеты ×2', forAd: 'за рекламу', fromCp: 'С чекпоинта', restart: 'Заново', next: 'Следующая башня',
    paused: 'Пауза', tapToContinue: 'Тапни, чтобы продолжить', adStub: 'Реклама (заглушка)', loading: 'Загрузка…',
    towerDone: 'Башня {n} пройдена!', rating: 'Рейтинг', 'chk.noDeath': 'Без смертей', 'chk.time': 'Время', 'chk.food': 'Еда', bonus: 'Награда',
    streak: 'Серия', berserk: 'Берсерк!', checkpoint: 'Чекпоинт {n}', floorMark: 'Этаж {n}', flyGone: 'отстала',
    'die.fall': 'В пропасть!', 'die.fly': 'Укус мухи', 'die.blades': 'Лопасти', 'die.pan': 'Ожог на сковородке', 'die.oil': 'Горячее масло', 'die.knife': 'Нож',
  },
  en: {
    title: 'Meatball', tower: 'Tower', play: 'Play', 'theme.kitchen': 'Kitchen', roof: 'Roof',
    hint1: 'Tap where you want to land.', hint2: 'Landing on a platform refills jump charges.', hint3: 'Pans burn, flies bite, blades kill.',
    fell: 'Splat!', runCoins: 'Coins this run', total: 'Total',
    continueAd: 'Continue', doubleAd: 'Coins ×2', forAd: 'watch ad', fromCp: 'From checkpoint', restart: 'Restart', next: 'Next tower',
    paused: 'Paused', tapToContinue: 'Tap to continue', adStub: 'Ad (stub)', loading: 'Loading…',
    towerDone: 'Tower {n} cleared!', rating: 'Rating', 'chk.noDeath': 'No deaths', 'chk.time': 'Time', 'chk.food': 'Food', bonus: 'Reward',
    streak: 'Streak', berserk: 'Berserk!', checkpoint: 'Checkpoint {n}', floorMark: 'Floor {n}', flyGone: 'gave up',
    'die.fall': 'Into the void!', 'die.fly': 'Fly bite', 'die.blades': 'Blades', 'die.pan': 'Burnt on the pan', 'die.oil': 'Hot oil', 'die.knife': 'Knife',
  },
  tr: {
    title: 'Köfte', tower: 'Kule', play: 'Oyna', 'theme.kitchen': 'Mutfak', roof: 'Çatı',
    hint1: 'İnmek istediğin yere dokun.', hint2: 'Platforma inince zıplama şarjları dolar.', hint3: 'Tava yakar, sinek ısırır, bıçaklar öldürür.',
    fell: 'Pat!', runCoins: 'Bu turda toplanan', total: 'Toplam',
    continueAd: 'Devam et', doubleAd: 'Para ×2', forAd: 'reklam izle', fromCp: 'Kontrol noktasından', restart: 'Baştan', next: 'Sonraki kule',
    paused: 'Duraklatıldı', tapToContinue: 'Devam etmek için dokun', adStub: 'Reklam (taslak)', loading: 'Yükleniyor…',
    towerDone: 'Kule {n} geçildi!', rating: 'Derece', 'chk.noDeath': 'Ölümsüz', 'chk.time': 'Süre', 'chk.food': 'Yemek', bonus: 'Ödül',
    streak: 'Seri', berserk: 'Çılgınlık!', checkpoint: 'Kontrol noktası {n}', floorMark: 'Kat {n}', flyGone: 'vazgeçti',
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
