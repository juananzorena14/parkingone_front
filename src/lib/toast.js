import toast from 'react-hot-toast';

export const notify = {
  ok:   (msg) => toast.success(msg),
  err:  (msg) => toast.error(msg || 'Ocurrió un error'),
  info: (msg) => toast(msg),
  // para promesas (loading -> success/error)
  promise: (p, { loading='Procesando…', success='Listo', error='Error' } = {}) =>
    toast.promise(p, { loading, success, error }),
};
