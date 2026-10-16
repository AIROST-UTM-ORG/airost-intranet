import React from "react";
import { Link, useNavigate, UNSAFE_NavigationContext } from "react-router-dom";

/**
 * Custom navigate hook that wraps React Router's useNavigate.
 * In React 19 testing environments with React Testing Library,
 * useEffect flush timing can cause useNavigate's internal activeRef to be false
 * when fireEvent.click is called immediately after a DOM change.
 * useDocNavigate ensures reliable navigation in both browser and test environments.
 */
export const useDocNavigate = () => {
  const navCtx = React.useContext(UNSAFE_NavigationContext);
  const reactRouterNavigate = useNavigate();

  return React.useCallback(
    (to, options = {}) => {
      const navigator = navCtx?.navigator;
      const basename = navCtx?.basename;
      if (typeof to === "string" && navigator) {
        let path = to;
        if (basename && basename !== "/" && !path.startsWith(basename)) {
          path = basename.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
        }
        if (options.replace) {
          navigator.replace(path, options.state);
        } else {
          navigator.push(path, options.state);
        }
        return;
      } else if (typeof to === "number" && navigator) {
        navigator.go(to);
        return;
      }
      reactRouterNavigate(to, options);
    },
    [navCtx, reactRouterNavigate]
  );
};

/**
 * DocLink renders a standard React Router <Link> with an <a href="...">,
 * ensuring middle-click, right-click, and "Open in new tab" behave natively,
 * while providing immediate client navigation on left-click.
 */
export const DocLink = React.forwardRef(({ to, onClick, children, ...props }, ref) => {
  const navigate = useDocNavigate();

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }
    if (
      !e.defaultPrevented &&
      e.button === 0 &&
      !e.metaKey &&
      !e.altKey &&
      !e.ctrlKey &&
      !e.shiftKey
    ) {
      e.preventDefault();
      navigate(to);
    }
  };

  return (
    <Link ref={ref} to={to} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
});

DocLink.displayName = "DocLink";
