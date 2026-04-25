import React from "react";
import { useNavigate } from "react-router-dom";

export default function FAQPage() {
  const navigate = useNavigate();

  return (
    <div className="p-10 text-white">
      <h1 className="text-3xl mb-6">FAQ PAGE WORKING</h1>

      <button onClick={() => navigate("/")}>
        Go Home
      </button>
    </div>
  );
}