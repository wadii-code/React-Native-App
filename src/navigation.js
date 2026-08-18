/**
 * A tab bar plus a one-level screen stack, written by hand.
 *
 * A navigation library would add a dependency and a re-architecture for what
 * this app needs: five tabs and push/pop for detail screens. Android's back
 * button is wired to pop the stack so the behaviour still feels native.
 */
import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import { BackHandler } from 'react-native';

const NavContext = createContext(null);

export function NavProvider({ children }) {
  const [tab, setTab] = useState('today');
  const [stack, setStack] = useState([]);
  const [quickAdd, setQuickAdd] = useState(null); // null | {type, initialText}

  const navigate = useCallback((screen, params) => {
    setStack((prev) => [...prev, { screen, params: params || {} }]);
  }, []);

  const goBack = useCallback(() => {
    setStack((prev) => prev.slice(0, -1));
  }, []);

  const resetTo = useCallback((nextTab) => {
    setStack([]);
    setTab(nextTab);
  }, []);

  const openQuickAdd = useCallback((options) => setQuickAdd(options || {}), []);
  const closeQuickAdd = useCallback(() => setQuickAdd(null), []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (quickAdd) {
        setQuickAdd(null);
        return true;
      }
      if (stack.length) {
        setStack((prev) => prev.slice(0, -1));
        return true;
      }
      if (tab !== 'today') {
        setTab('today');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack.length, tab, quickAdd]);

  const value = useMemo(
    () => ({
      tab,
      setTab: resetTo,
      stack,
      current: stack.length ? stack[stack.length - 1] : null,
      navigate,
      goBack,
      quickAdd,
      openQuickAdd,
      closeQuickAdd,
    }),
    [tab, stack, navigate, goBack, resetTo, quickAdd, openQuickAdd, closeQuickAdd]
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav() {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used inside <NavProvider>');
  return ctx;
}
