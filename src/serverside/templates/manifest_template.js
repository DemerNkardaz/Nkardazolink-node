class Manifest {
  constructor() {
    const shortcuts = [
      { ru: 'Мондзёсё | Галерей Гербов', en: 'Monjōshō | The Gallery of Crests' }, '/Nkardazolink/?mode=kamon',
      { ru: 'Сасимоно Тэнранкай | Выставка Штандартов', en: 'Sashimono Tenrankai | The Banners Exhibition' }, '/Nkardazolink/?mode=banners'
    ];
    const iconSizes = ['48x48', '72x72', '96x96', '144x144', '192x192', '256x256', '512x512'];
    
    this.id = 'com.demernkardaz.app';
    this.name = { ru: 'Нкардазолинк', en: 'Nkardazolink' };
    this.name.mo = this.name.ru;
    this.short_name = { ru: 'Нкардаз', en: 'Nkardaz', ja: 'ナカルダズ', zh: '尼卡尔达兹', ko: '니카르다즈', vi: 'Nkarđaz' };
    this.short_name.mo = this.short_name.ru;
    this.description = { ru: 'Персональный сайт Демера Нкардаз', en: 'Demer Nkardaz’s personal website' };
    this.start_url = '/Nkardazolink/';
    this.display_override = ['window-controls-overlay'];
    this.display = 'standalone';
    this.orientation = 'any';
    this.theme_color = '#E2B13C';
    this.background_color = '#333333';
    this.launch_handler = { client_mode: ['focus-existing', 'auto'] };
    this.categories = ['books', 'literature', '3d', 'art', 'design', 'graphics', 'layout', 'wolrdbuilding', 'lore', 'artist', 'developer'];
    this.shortcuts = this.generateShortcutList(shortcuts);
    this.icons = this.generateIconList(iconSizes, 'android', true);
    this.screenshots = [
      { src: './screenshot720p_win.webp', sizes: '1280x720', type: 'image/webp', form_factor: 'wide', platform: 'windows' },
      { src: './screenshot720p_mob.webp', sizes: '324x720', type: 'image/webp', form_factor: 'narrow', platform: 'android' }
    ];
    this.serviceworker = {
      src: './serviceworker.js',
      scope: './',
      use_cache: true
    };

  }

  generateShortcutList(array) {
    const shortcuts = [];
    const shortcutSizes = ['48x48', '72x72', '96x96', '144x144', '192x192'];
    for (let i = 0; i < array.length; i += 2) {
      const names = array[i];
      const url = array[i + 1];
      shortcuts.push({ name: names, url: url, icons: this.generateIconList(shortcutSizes, 'android') });
    }
    return shortcuts;
  }

  generateIconList(sizes, type, maskable = false) {
    const icons = [];
    sizes.forEach(size => {
      icons.push({ src: `./${type}/${type}_${size}.png`, sizes: size, type: 'image/png' });
      maskable && icons.push({ src: `./${type}/${type}_${size}-mask.png`, sizes: size, type: 'image/png', purpose: 'maskable' });
    });
    return icons;
  }
  
  getManifest() {
    return {
      id: this.id,
      name: this.name,
      short_name: this.short_name,
      description: this.description,
      start_url: this.start_url,
      display_override: this.display_override,
      display: this.display,
      orientation: this.orientation,
      theme_color: this.theme_color,
      background_color: this.background_color,
      launch_handler: this.launch_handler,
      categories: this.categories,
      shortcuts: this.shortcuts,
      icons: this.icons,
      screenshots: this.screenshots,
      serviceworker: this.serviceworker
    };
  }
}

module.exports = { Manifest };
