import { FunctionComponent, ReactNode } from "react";
import Link from "next/link";
import { Account } from "src/account/components/Account";
interface iProps {
  main: ReactNode;
}

const Layout: FunctionComponent<iProps> = ({ main }) => {
  return (
    <div className="bg-gray-900 max-w-screen-2xl mx-auto text-white">
      <nav className="bg-gray-800" style={{ height: 64 }}>
        <div className="px-6 flex items-center justify-between h-16">
          <Link href="/">
            <p className="font-medium">
              ONE World <span className="ml-1">🌏</span>
            </p>
          </Link>
          <Link href="/my-locations">
            <p className="cursor-pointer">View My Locations</p>
          </Link>
          <Account />
        </div>
      </nav>
      <main style={{ minHeight: "calc(100vh - 64px)" }}>{main}</main>
    </div>
  );
};

export default Layout;
