import {createIntent} from "./func.js";
import {wrapper} from "../lib/wrapr.js";

exports.handler = wrapper(createIntent,"NETLIFY");