"use client";

import type { OrganizationType } from "@/types/cbac";
import { cn } from "@/lib/utils";
import { Factory, Truck, Warehouse, Store, Gavel, Shield } from "lucide-react";
import type { ElementType } from "react";
import { motion } from "framer-motion";

type RoleInfo = {
  id: OrganizationType | 'admin';
  name: string;
  description: string;
  icon: ElementType;
  color: string;
};

// Organization types (no patients in CBAC)
const ALL_ORG_TYPES: (OrganizationType | 'admin')[] = [
  "manufacturer",
  "distributor",
  "logistics",
  "pharmacy",
  "regulator",
];

const roleInfoMap: Record<OrganizationType | 'admin', RoleInfo> = {
  manufacturer: {
    id: "manufacturer",
    name: "Manufacturer",
    description: "Produce & register batches",
    icon: Factory,
    color: "from-blue-500 to-blue-600",
  },
  distributor: {
    id: "distributor",
    name: "Distributor",
    description: "Move batches in supply chain",
    icon: Truck,
    color: "from-primary to-accent",
  },
  logistics: {
    id: "logistics",
    name: "Logistics",
    description: "Manage warehousing",
    icon: Warehouse,
    color: "from-amber-500 to-amber-600",
  },
  pharmacy: {
    id: "pharmacy",
    name: "Pharmacy",
    description: "Dispense medicines",
    icon: Store,
    color: "from-purple-500 to-purple-600",
  },
  regulator: {
    id: "regulator",
    name: "Regulator",
    description: "Oversee & approve batches",
    icon: Gavel,
    color: "from-rose-500 to-rose-600",
  },
  admin: {
    id: "admin",
    name: "Admin",
    description: "Issue credentials & manage",
    icon: Shield,
    color: "from-red-500 to-red-600",
  },
};

interface RoleSelectorProps {
  selectedRole: OrganizationType | 'admin';
  onRoleChange: (role: OrganizationType | 'admin') => void;
}

export function RoleSelector({ selectedRole, onRoleChange }: RoleSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {ALL_ORG_TYPES.map((role, index) => {
        const { id, name, description, icon: Icon, color } = roleInfoMap[role];
        const isSelected = selectedRole === id;
        
        return (
          <motion.div
            key={id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            onClick={() => onRoleChange(id)}
            className={cn(
              "relative cursor-pointer rounded-xl border-2 p-3 transition-all duration-200",
              "hover:shadow-lg hover:-translate-y-0.5",
              isSelected
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border/50 hover:border-primary/30 bg-background/50"
            )}
          >
            {/* Selection indicator */}
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center shadow-lg"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="h-3 w-3 rounded-full bg-primary-foreground"
                />
              </motion.div>
            )}
            
            {/* Icon with gradient background */}
            <div className={cn(
              "mx-auto h-10 w-10 rounded-lg flex items-center justify-center mb-2",
              isSelected ? `bg-gradient-to-br ${color}` : "bg-muted"
            )}>
              <Icon className={cn(
                "h-5 w-5",
                isSelected ? "text-white" : "text-muted-foreground"
              )} />
            </div>
            
            {/* Role name */}
            <h3 className={cn(
              "font-semibold text-sm text-center",
              isSelected ? "text-primary" : "text-foreground"
            )}>
              {name}
            </h3>
            
            {/* Description - only show on larger screens */}
            <p className="hidden sm:block text-[10px] text-muted-foreground text-center mt-0.5 leading-tight">
              {description}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
