window.DarkLoadingScreenConfig = {
    // Endast fyra inställningar behövs nu
    videoUrl: 'assets/bakgrund.mp4', //'https://youtu.be/LlN8MPS7KQs', // YouTube länk
    audioFile: 'assets/music.mp3',            // MP3 fil som ska spelas direkt
    audioVolume: 0.05,                         // 0.0 - 1.0 startvolym för musiken
    staffImagePath: 'assets/images/staffs/',   // Bas-sökväg för staff-bilder
    staff: [                                   // Använd .webp filer som finns i mappen
        { title: 'Styrelse',          name: 'Choloo',  image: 'choloo.webp' },
        { title: 'Ledningsgrupp',     name: 'Linkan',  image: 'linkan.webp' },
        { title: 'Ledningsgrupp',     name: 'Maskin',  image: 'maskin.webp' },
        { title: 'Huvudadministratör',name: 'Linus',   image: 'linus.webp' },
        { title: 'Huvudutvecklare',   name: 'Swompen', image: 'swompen.webp' },
    ],
    // Popup meddelanden (visas i loop uppe vänster). Varje objekt: { title: '', message: '' }
    messages: [
        { title: 'Välkommen', message: 'Kul att du joinar servern!' },
        { title: 'Discord', message: 'Gå med i vår Discord för nyheter.' },
        { title: 'Tips', message: 'Respektera andra spelare och ha kul.' }
    ],
    // Hörn för popup: 'top-left', 'top-right', 'bottom-left', 'bottom-right'
    popupCorner: 'top-right',
    // Intervall (sekunder) per popup-visning
    popupIntervalSeconds: 6
};
