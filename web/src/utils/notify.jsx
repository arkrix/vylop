import toast from 'react-hot-toast';

const toastTimestamps = new Map();
const COOLDOWN_MS = 5000; // 5 seconds debounce window

const shouldThrottle = (message) => {
  const now = Date.now();
  const lastTime = toastTimestamps.get(message);

  if (lastTime && now - lastTime < COOLDOWN_MS) {
    return true;
  }

  toastTimestamps.set(message, now);
  return false;
};

export const notify = {
  success: (message, options = {}) => {
    if (shouldThrottle(message)) return;
    return toast.success(message, {
      id: options.id || message,
      ...options,
    });
  },

  error: (message, options = {}) => {
    if (shouldThrottle(message)) return;
    return toast.error(message, {
      id: options.id || message,
      ...options,
    });
  },

  loading: (message, options = {}) => {
    return toast.loading(message, {
      id: options.id || message,
      ...options,
    });
  },

  dismiss: (toastId) => {
    toast.dismiss(toastId);
  },
};

export default notify;