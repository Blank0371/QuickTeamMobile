import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { palette, ThemeColors } from "./palette";

type Mode = "light"| "dark" | "system";

type ThemeContextType = {
    theme: ThemeColors;
    mode: Mode;
    isDark: boolean;
    setMode: (m: Mode) => void;
}

const Ctx = createContext<ThemeContextType>({} as ThemeContextType);
export const useTheme = () => useContext(Ctx);

export function ThemeProvider({ children }: {children: React.ReactNode}){
    const os = useColorScheme();
    const [mode, setModeState] = useState<Mode>("system");

    useEffect(()=>{
        AsyncStorage.getItem("themeMode").then((v)=>{
            if(v==="light" || v === "dark" || v === "system") setModeState(v);
        });
    },[]);

    const setMode = useCallback((m: Mode) => {
        setModeState(m);
        AsyncStorage.setItem("themeMode", m);
    }, []);

    const isDark = mode === "system" ? os === "dark" : mode === "dark";
    const theme = isDark? palette.dark : palette.light;

    const value = useMemo(
        () => ({ theme, mode, isDark, setMode }),
        [theme, mode, isDark, setMode],
    );

    return(
        <Ctx.Provider value={value}>
            {children}
        </Ctx.Provider>
    );
}