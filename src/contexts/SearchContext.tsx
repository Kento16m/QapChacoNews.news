import { createContext, useContext, useState, type ReactNode } from "react";

type SearchContextValue = {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (value: boolean) => void;
};

const SearchContext = createContext<SearchContextValue | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <SearchContext.Provider value={{ searchTerm, setSearchTerm, isSearchOpen, setIsSearchOpen }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearchContext() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearchContext must be used within SearchProvider");
  }

  return context;
}
