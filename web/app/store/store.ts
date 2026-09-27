// store.ts
import { configureStore,combineReducers  } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import { storage } from './web-storage';
import authReducer from './auth/auth-slice';
import cameraReducer from './camera-slice'
import crabReducer from './crab-slice'
import chatReducer from './chat-slice'
import { statusApi } from './auth/auth-status-slice';
const rootReducer = combineReducers({
  auth: authReducer,
  camera: cameraReducer,
  crab: crabReducer,
  chat: chatReducer,
  [statusApi.reducerPath]: statusApi.reducer, // correct way
})
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth'], 
}
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Ignore these specific non-serializable actions from redux-persist
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(statusApi.middleware),
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
