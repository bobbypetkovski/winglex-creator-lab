import { createElement } from 'react';

export default function Link({ children, href, ...rest }) {
  return createElement('a', { href, ...rest }, children);
}
