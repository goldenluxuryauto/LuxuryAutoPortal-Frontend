import React from "react";
import { ExternalLink } from "lucide-react";

interface CarHeaderProps {
  car: any;
  onboarding: any;
  onNavigateToClient?: (clientId: number) => void;
}

export default function CarHeader({ car, onboarding, onNavigateToClient }: CarHeaderProps) {
  return (
    <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Car Information */}
        <div>
          <h3 className="text-xs font-medium text-gray-400 mb-2">Car Information</h3>
          <div className="space-y-1">
            <div>
              <span className="text-gray-400 text-xs">Car Name: </span>
              <span className="text-white text-xs">
                {car?.makeModel || `${car?.year || ""} ${car?.vin || ""}`.trim()}
              </span>
            </div>
            <div>
              <span className="text-gray-400 text-xs">VIN #: </span>
              <span className="text-white font-mono text-xs">{car?.vin || "N/A"}</span>
            </div>
            <div>
              <span className="text-gray-400 text-xs">License: </span>
              <span className="text-white text-xs">{car?.licensePlate || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Owner Information */}
        <div>
          <h3 className="text-xs font-medium text-gray-400 mb-2">Owner Information</h3>
          <div className="space-y-1">
            <div>
              <span className="text-gray-400 text-xs">Name: </span>
              {car?.clientId && onNavigateToClient ? (
                <button
                  onClick={() => onNavigateToClient(car.clientId)}
                  className="text-[#EAEB80] hover:text-[#d4d570] hover:underline transition-colors text-xs cursor-pointer"
                >
                  {car?.owner 
                    ? `${car.owner.firstName} ${car.owner.lastName}` 
                    : car?.ownerFirstName && car?.ownerLastName
                    ? `${car.ownerFirstName} ${car.ownerLastName}`
                    : "N/A"}
                </button>
              ) : (
                <span className="text-white text-xs">
                  {car?.owner 
                    ? `${car.owner.firstName} ${car.owner.lastName}` 
                    : car?.ownerFirstName && car?.ownerLastName
                    ? `${car.ownerFirstName} ${car.ownerLastName}`
                    : "N/A"}
                </span>
              )}
            </div>
            <div>
              <span className="text-gray-400 text-xs">Contact #: </span>
              <span className="text-white text-xs">
                {car?.owner?.phone || car?.ownerPhone || "N/A"}
              </span>
            </div>
            <div>
              <span className="text-gray-400 text-xs">Email: </span>
              <span className="text-white text-xs break-all">
                {car?.owner?.email || car?.ownerEmail || "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Car Specifications */}
        <div>
          <h3 className="text-xs font-medium text-gray-400 mb-2">Car Specifications</h3>
          <div className="space-y-1">
            <div>
              <span className="text-gray-400 text-xs">Fuel/Gas: </span>
              <span className="text-white text-xs">
                {onboarding?.fuelType || car?.fuelType || "N/A"}
              </span>
            </div>
            <div>
              <span className="text-gray-400 text-xs">Tire Size: </span>
              <span className="text-white text-xs">
                {onboarding?.tireSize || car?.tireSize || "N/A"}
              </span>
            </div>
            <div>
              <span className="text-gray-400 text-xs">Oil Type: </span>
              <span className="text-white text-xs">
                {onboarding?.oilType || car?.oilType || "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Turo Links */}
        <div>
          <h3 className="text-xs font-medium text-gray-400 mb-2">Turo Links</h3>
          <div className="space-y-1">
            {car?.turoLink && (
              <div>
                <a
                  href={car.turoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#EAEB80] hover:underline text-xs flex items-center gap-1"
                >
                  Turo Link: View Car
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            {car?.adminTuroLink && (
              <div>
                <a
                  href={car.adminTuroLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#EAEB80] hover:underline text-xs flex items-center gap-1"
                >
                  Admin Turo Link
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            {!car?.turoLink && !car?.adminTuroLink && (
              <span className="text-gray-500 text-xs">No Turo links available</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
