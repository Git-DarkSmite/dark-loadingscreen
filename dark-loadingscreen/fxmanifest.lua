fx_version 'cerulean'
game 'gta5'

name 'dark-loadingscreen'
author 'DarkSmite, Copilot'
description 'Dark neon loading screen with video background and staff list'
version '1.0.1'


loadscreen 'web/index.html'

loadscreen_cursor 'yes'


files {
    'web/index.html',
    'web/style.css',
    'web/script.js',
    'web/config.js',
    'web/assets/bakgrund.mp4',
    'web/assets/music.mp3',
    'web/assets/images/staffs/*.webp',

    'web/assets/**/*',
    'web/**/*'
}

lua54 'yes'
