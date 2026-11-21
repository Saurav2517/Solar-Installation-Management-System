import morgan from 'morgan';
import { config } from '../config';

// Custom Morgan format for development
const devFormat = ':method :url :status :response-time ms - :res[content-length]';

// Custom Morgan format for production  
const prodFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';

export const requestLogger = morgan(
  config.app.env === 'production' ? prodFormat : devFormat
);
