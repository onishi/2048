import "./style.css";
import "./help.css";
import { applyTheme, loadStoredTheme } from "./ui/theme";

applyTheme(loadStoredTheme());
