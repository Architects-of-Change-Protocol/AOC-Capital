export type DerivedLensType = "overview" | "delivery" | "leadership" | "controls" | "memory";

export type DerivedLensMetadata = {
  route: string;
  title: string;
  displayLabel: string;
  breadcrumbLabel: string;
  parent: "/workspace";
  lensType: DerivedLensType;
};

export const DERIVED_LENS_METADATA: DerivedLensMetadata[] = [
  { route: "/dashboard", title: "Overview", displayLabel: "Overview", breadcrumbLabel: "Overview", parent: "/workspace", lensType: "overview" },
  { route: "/command-center", title: "Delivery Status", displayLabel: "Delivery Status", breadcrumbLabel: "Delivery Status", parent: "/workspace", lensType: "delivery" },
  { route: "/executive", title: "Leadership View", displayLabel: "Leadership View", breadcrumbLabel: "Leadership View", parent: "/workspace", lensType: "leadership" },
  { route: "/portfolio", title: "Project Controls", displayLabel: "Project Controls", breadcrumbLabel: "Project Controls", parent: "/workspace", lensType: "controls" },
  { route: "/operational-memory", title: "Memory", displayLabel: "Memory", breadcrumbLabel: "Memory", parent: "/workspace", lensType: "memory" },
  { route: "/stakeholder-intel", title: "Stakeholders", displayLabel: "Stakeholders", breadcrumbLabel: "Stakeholders", parent: "/workspace", lensType: "memory" },
];
