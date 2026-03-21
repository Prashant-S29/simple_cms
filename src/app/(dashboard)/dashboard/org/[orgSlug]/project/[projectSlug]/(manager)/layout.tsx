import "~/styles/globals.css";
import { type Metadata } from "next";
import {
  ManagerHeader,
  ManagerSideMenu,
} from "~/components/dashboard/project/manager";

export const metadata: Metadata = {
  title: "Content Manager",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

interface Props {
  children: React.ReactNode;
}

export default function ManagerLayout({ children }: Props) {
  return (
    <main className="h-screen w-full">
      <ManagerHeader />
      <main className="flex h-full w-full">
        <ManagerSideMenu />
        <div className="h-full min-w-0 flex-1 p-2 pt-18">
          <div className="bg-secondary custom-scrollbar h-full w-full overflow-y-scroll rounded-2xl">
            {children}
          </div>
        </div>
      </main>
    </main>
  );
}
