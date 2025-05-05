import {message} from "./func.js";
import {wrapper} from "../lib/wrapr.js";

exports.handler = wrapper(message,"NETLIFY");