// Palette — "Werksdatenblatt" system: Deep Green brand, Gold Bronze accent,
// Signal Red reserved strictly for destructive actions. See Farbpalette.html.
export const palette = {
    light:{
        bg:         "#F3F0E8", // page background
        surface:    "#E9E2D0", // cards, panels
        text:       "#16241C", // green-deep — primary text
        muted:      "#5B564A", // secondary text, placeholders
        border:     "#D9CFB6", // dividers, hairlines
        accent:     "#8A6B3C", // primary buttons, links (bronze)
        accentText: "#FAF7F0", // text/icons on accent
        danger:     "#A83824", // destructive actions only
        gradient:   ["#E7EDE4", "#F3F0E8"] as [string, string], // soft green wash → bg (top→bottom)
    },
    dark:{
        bg:         "#0D100E", // carbon — page background
        surface:    "#1A1F1C", // graphite — cards, panels
        text:       "#EDE9E0", // bone — primary text
        muted:      "#6E736C", // secondary text, placeholders
        border:     "#352F1F", // bronze @26% over carbon — dividers
        accent:     "#A8874F", // primary buttons, links (bronze)
        accentText: "#0D100E", // dark text/icons on bronze
        danger:     "#C1442D", // destructive actions only
        gradient:   ["#16241C", "#0D100E"] as [string, string], // deep green → carbon (top→bottom)
    },
};

export type ThemeColors = typeof palette.light;
