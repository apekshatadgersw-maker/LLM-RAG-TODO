"use client";

import { useAppSelector } from "../hook";

export default function Dashboard() {
  const items = useAppSelector((state) => state.list.items);
  return (
    <div>
      <div className="grid grid-rows-1 w-full flex justify-center">
        <h2>TODO list already added is </h2>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </div>
    </div>
  );
}
