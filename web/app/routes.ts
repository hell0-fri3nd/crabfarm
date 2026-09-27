import { type RouteConfig,route,index } from "@react-router/dev/routes";

export default [

    route("/","routes/default-routing.tsx"),
    
    // Authentication section
    route("/auth", "routes/auth-layout.tsx", [
        index("routes/auth/login.tsx"),
    ]),

    // Pin section
    route("/access-token", "routes/pin-layout.tsx", [
        index("routes/auth/pin.tsx"),
    ]),

    // Protected section
    route("/page", "routes/page-layout.tsx", [
        route("dashboard", "routes/page/dashboard.tsx"),
        route("configuration", "routes/page/configuration.tsx"),
        route("logs", "routes/page/logs.tsx"),
        route("activity-logs", "routes/page/activity-logs.tsx"),
        route("weigh-and-scan", "routes/page/weigh-and-scan.tsx"),
        route("sensor-logs", "routes/page/sensor-logs.tsx"),
    ]),

    // Settings section
    route("/settings", "routes/settings-layout.tsx", [
        route("users-settings", "routes/settings/users-settings.tsx"),
        route("account-settings", "routes/settings/account-settings.tsx"),
    ]),
    
    route("*", "routes/page-not-found.tsx")
 
] satisfies RouteConfig;