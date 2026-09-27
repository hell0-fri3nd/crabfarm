import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import React from "react"
import type { Route } from "./+types/root";
import "./app.css";
import { ThemeProvider } from "./components/theme-provider";
import Bubbles from "./components/custom/bubbles";
import { Provider, useDispatch } from "react-redux";
import { store, persistor, type AppDispatch  } from "./store/store";
import { PersistGate } from "redux-persist/lib/integration/react";
// import { PersistGate } from "redux-persist/lib/integration/react.js";
import InfiniteProgressBar from "./components/infinite-progress"
import { refreshExpired, accessExpired, logout,clearAuth } from "./store/auth/auth-slice";
import { useGetStatusQuery } from "./store/auth/auth-status-slice";
import { useMobileNavigation } from "./hooks/user-mobile-navigations";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./query-client";
import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";



export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

const loadingMarkup = (
  <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm z-50">
    <div >
      <InfiniteProgressBar className="scale-90"/>
    </div>
  </div>
);

export function AuthProvider({ children }: { children: React.ReactNode }) {

  const cleanup = useMobileNavigation();
  const dispatch = useDispatch<AppDispatch>(); 

  const { data, error, isLoading } = useGetStatusQuery(undefined, {
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });


  // Handle auth errors
  React.useEffect(() => {
    const detail = (error as any)?.data?.detail;

    if (detail === "MISSING_ACCESS_TOKEN") {
      dispatch(accessExpired());
    }

    if (detail === "MISSING_REFRESH_TOKEN") {
      cleanup();
      dispatch(logout());
      dispatch(accessExpired());
      dispatch(refreshExpired());
      dispatch(clearAuth());
      persistor.purge();
    }
  }, [error, dispatch, cleanup]);

  if (isLoading) {
    return (  
      <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm z-50">
        <div >
          <InfiniteProgressBar className="scale-90"/>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-content" />
        <Meta />
        <Links />
      </head>
      <body>
        
        <Provider store={store}>
          <PersistGate loading={loadingMarkup} persistor={persistor}>
            <QueryClientProvider client={queryClient}>
              <TooltipProvider>
              <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                <AuthProvider>
                  <Bubbles count={30}/>
                  <Toaster richColors theme="system"/>
                  {children}
                </AuthProvider>
              </ThemeProvider>
              </TooltipProvider>
            </QueryClientProvider>
          </PersistGate>
          <ScrollRestoration />
          <Scripts />
        </Provider>

      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <Bubbles count={30}/>
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>

        </pre>
      )}
                <footer> hellofriend 2025</footer>
    </main>
  );
}
