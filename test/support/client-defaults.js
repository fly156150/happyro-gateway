// Small contract fixture. Production values come exclusively from the built PWA schema.
module.exports = { fields: {
  CLIENT_SCRIPT_TEXT_MIN_CONTRAST: { path: 'scriptText.minContrast', type: 'number', default: 4.5, min: 4.5, max: 7 },
  CLIENT_CAMERA_PHONE_LANDSCAPE_ZOOM: { path: 'camera.phoneLandscapeZoom', type: 'number', default: 95, min: 1, max: 325 },
  CLIENT_CAMERA_PHONE_PORTRAIT_ZOOM: { path: 'camera.phonePortraitZoom', type: 'number', default: 170, min: 1, max: 325 },
  CLIENT_AUTO_COMBAT_SEARCH_RANGE: { path: 'autoCombat.ranges.search', type: 'number', default: 20, min: 1, max: 50, integer: true },
  CLIENT_AUTO_COMBAT_ACTIVITY_RANGE: { path: 'autoCombat.ranges.activity', type: 'number', default: 30, min: 1, max: 100, integer: true },
  CLIENT_AUTO_TELEPORT_ENABLED: { path: 'autoCombat.teleport.enabled', type: 'boolean', default: true },
  CLIENT_AUTO_PICKUP_CATEGORIES: { path: 'pickup.categories', type: 'list', default: ['equipment', 'card'], options: ['equipment', 'card', 'other'] },
  CLIENT_GRAPHICS_FPS_LIMIT: { path: 'graphics.fpslimit', type: 'number', default: 60, options: [-1,30,60,90,120] },
  CLIENT_BGM_VOLUME: { path: 'audio.BGM.volume', type: 'number', default: 0.5, min: 0, max: 1 },
} };
