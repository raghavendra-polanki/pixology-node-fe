import { AppProviders } from "./providers";
import { AppRouter } from "./router/AppRouter";

const App = () => {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
};

export default App;
