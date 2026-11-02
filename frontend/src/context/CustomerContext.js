"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

const CustomerContext = createContext();

export const CustomerProvider = ({ children }) => {
  const [customers, setCustomers] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("wa_customers");
    if (saved) {
      try {
        setCustomers(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse customers from localStorage", e);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("wa_customers", JSON.stringify(customers));
    }
  }, [customers, isLoaded]);

  const addCustomer = (customer) => {
    setCustomers((prev) => [...prev, customer]);
  };

  const removeCustomer = (id) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <CustomerContext.Provider value={{ customers, addCustomer, removeCustomer }}>
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomers = () => useContext(CustomerContext);
