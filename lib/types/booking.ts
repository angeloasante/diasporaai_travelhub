export interface Booking {
  id: string;
  duffelId: string | null;
  userId: string;
  chatId: string;
  offerId: string;
  status: "pending" | "pending_payment" | "processing" | "ticketed" | "confirmed" | "failed" | "cancelled" | "refund_pending" | "refunded";
  reference: string | null;
  totalAmount: string;
  totalCurrency: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string | null;
  cabinClass: string;
  passengers: Passenger[];
  offerDetails: OfferDetails | null;
  airlineLogo: string | null;
  flightImages: string[] | null;
  bookingData: BookingFormData | null;
  contactInfo: ContactInfo | null;
  paymentMethod: string | null;
  paymentStatus: "init" | "paid" | "failed" | "refund_requested" | "refunded" | null;
  originalPrice: string;
  originalCurrency: string;
  markupAmount: string;
  customerPrice: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

export interface Passenger {
  type: "adult" | "child" | "infant_without_seat";
  title?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  passportNumber?: string;
  passportExpiryDate?: string;
  nationality?: string;
}

export interface OfferDetails {
  id: string;
  slices: Slice[];
  owner: Airline;
  total_amount: string;
  total_currency: string;
  base_amount: string;
  base_currency: string;
  tax_amount: string;
  tax_currency: string;
}

export interface Slice {
  id: string;
  origin: Airport;
  destination: Airport;
  duration: string;
  segments: Segment[];
}

export interface Segment {
  id: string;
  origin: Airport;
  destination: Airport;
  departing_at: string;
  arriving_at: string;
  duration: string;
  marketing_carrier: Airline;
  operating_carrier: Airline;
  marketing_carrier_flight_number: string;
  aircraft: Aircraft | null;
  passengers: SegmentPassenger[];
}

export interface Airport {
  iata_code: string;
  name: string;
  city_name: string;
  city?: {
    name: string;
  };
}

export interface Airline {
  iata_code: string;
  name: string;
  logo_symbol_url?: string;
  logo_lockup_url?: string;
}

export interface Aircraft {
  iata_code: string;
  name: string;
}

export interface SegmentPassenger {
  cabin_class: string;
  cabin_class_marketing_name: string;
  baggages: Baggage[];
}

export interface Baggage {
  type: string;
  quantity: number;
}

export interface ContactInfo {
  email: string;
  phone?: string;
}

export interface BookingFormData {
  passengers: Passenger[];
  contactInfo: ContactInfo;
}
