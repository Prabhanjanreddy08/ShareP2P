import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { SendPage } from "./pages/SendPage";
import { SharePage } from "./pages/SharePage";
import { ReceivePage } from "./pages/ReceivePage";
import { ReceiveSessionPage } from "./pages/ReceiveSessionPage";
import { LifeDropCreatePage } from "./pages/LifeDropCreatePage";
import { LifeDropSharePage } from "./pages/LifeDropSharePage";
import { LifeDropReceivePage } from "./pages/LifeDropReceivePage";
import { NotFoundPage } from "./pages/NotFoundPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/send" element={<SendPage />} />
        <Route path="/share/:sessionId" element={<SharePage />} />
        <Route path="/receive" element={<ReceivePage />} />
        <Route path="/receive/:sessionId" element={<ReceiveSessionPage />} />
        <Route path="/lifedrop/create" element={<LifeDropCreatePage />} />
        <Route path="/lifedrop/:sessionId" element={<LifeDropSharePage />} />
        <Route path="/lifedrop/receive/:sessionId" element={<LifeDropReceivePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
