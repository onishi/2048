import "./style.css";
import { App } from "./app";

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) throw new Error("#app element not found");

new App(root);
