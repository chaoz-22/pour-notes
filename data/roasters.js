const { getRoasterGuideCloudPath } = require("./cloud-config");

const ROASTERS = [
  { name: "Aery", logo: "A", logoImage: "/assets/roasters/aery.png" },
  { name: "April", logo: "A", logoImage: "/assets/roasters/april.png" },
  { name: "Apollon's Gold", logo: "AG", logoImage: "/assets/roasters/apollons-gold.png" },
  { name: "Blendin", logo: "B", logoImage: "/assets/roasters/blendin.png" },
  { name: "Coffee Collective", logo: "CC", logoImage: "/assets/roasters/coffee-collective.jpg" },
  { name: "Dak", logo: "D", logoImage: "/assets/roasters/dak.png" },
  { name: "Friedhats", logo: "F", logoImage: "/assets/roasters/friedhats.png" },
  { name: "GoodLife", logo: "GL", logoImage: "/assets/roasters/goodlife.png" },
  { name: "Hatch", logo: "H", logoImage: "/assets/roasters/hatch.png" },
  { name: "Lab 19", logo: "L19", logoImage: "/assets/roasters/lab-19.png" },
  { name: "Leaves", logo: "L", logoImage: "/assets/roasters/leaves.png" },
  { name: "Leuchtfeuer", logo: "LF", logoImage: "/assets/roasters/leuchtfeuer.png" },
  { name: "OMA", logo: "OMA", logoImage: "/assets/roasters/oma.png" },
  { name: "Ona", logo: "ONA", logoImage: "/assets/roasters/ona.png" },
  { name: "One Half", logo: "OH", logoImage: "/assets/roasters/one-half.png" },
  { name: "Peoplepossession", logo: "PP", logoImage: "/assets/roasters/peoplepossession.png" },
  { name: "Prodigal", logo: "P", logoImage: "/assets/roasters/prodigal.png" },
  { name: "Sey", logo: "S", logoImage: "/assets/roasters/sey.png" },
  { name: "Specialguests", logo: "SG", logoImage: "/assets/roasters/special-guests.png" },
  { name: "Standout", logo: "S", logoImage: "/assets/roasters/standout.png" },
  { name: "Sweven", logo: "SW", logoImage: "/assets/roasters/sweven.png" },
  { name: "Swerl", logo: "SR", logoImage: "/assets/roasters/swerl.png" },
  { name: "Tanat", logo: "T", logoImage: "/assets/roasters/tanat.png" },
  { name: "Tim Wendelboe", logo: "TW", logoImage: "/assets/roasters/tim-wendelboe.png" }
].map((roaster) => ({
  ...roaster,
  logoImage: getRoasterGuideCloudPath(roaster.logoImage)
}));

module.exports = {
  ROASTERS
};
