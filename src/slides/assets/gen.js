import { jsPDF } from "jspdf";
import "./fonts/Roboto-Bold-normal";
import "./fonts/Roboto-Regular-normal";
import "./fonts/Roboto-Light-normal";
import Interpreter from "sciolyff/interpreter";
import {
  formatSchool,
  generateFilename,
  ordinalize,
  tournamentTitle,
  tournamentTitleShort,
} from "../../../utils/sharedHelpers";

let colors;
fetch("/cache/bg-colors.json")
  .then((r) => r.json())
  .then((c) => (colors = c));

// https://stackoverflow.com/a/12646864/9129832
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

window.getColor = (sciolyff) => {
  const interpreter = new Interpreter(sciolyff);
  const filename = generateFilename(interpreter);
  return colors[filename] || "#1f1b35";
};

window.generatePdf = (sciolyff1, sciolyff2, options) => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "in",
    format: [16, 9],
    putOnlyUsedFonts: true,
    compress: true,
  });
  doc.deletePage(1);

  const [interpreter1, interpreter2] = [sciolyff1, sciolyff2]
    .map((sciolyff) => (sciolyff ? new Interpreter(sciolyff) : null))
    .sort(
      (a, b) =>
        a?.tournament?.division?.localeCompare(b?.tournament?.division ?? "") ??
        0
    );

  const tournamentName =
    interpreter1.tournament.year +
    " " +
    tournamentTitleShort(interpreter1.tournament);

  doc.setDocumentProperties({
    title: tournamentName + " Awards",
    author: "Duosmium Results",
    creator: "Duosmium Results",
  });

  const sidebarLineHeight = options.sidebarLineHeight;
  const dividerOffset = options.dividerOffset;

  const titleFontSize = options.titleFontSize;
  const headerFontSize = options.headerFontSize;
  const sidebarFontSize = options.sidebarFontSize;
  const teamFontSize = options.teamFontSize;
  const teamLineHeight = options.teamLineHeight;

  const themeBgColor = options.themeBgColor;
  const themeTextColor = options.themeTextColor;
  const bgColor = options.bgColor;
  const textColor = options.textColor;
  const headerTextColor = options.headerTextColor;

  const randomOrder = options.randomOrder;

  function addTextSlide(title, subtitle) {
    doc.addPage();
    doc.setFillColor(themeBgColor);
    doc.rect(0, 0, 16, 9, "F");
    doc.setFontSize(titleFontSize);
    doc.setFont("Roboto-Bold");
    doc.setTextColor(themeTextColor);
    const titleText = doc.splitTextToSize(title, 12);
    const textHeight = (1.5 * titleFontSize * titleText.length) / 72;
    doc.text(titleText, 8, 4.5 - textHeight / 2, {
      align: "center",
      lineHeightFactor: 1.5,
    });
    if (subtitle) {
      doc.setFontSize(titleFontSize * 0.75);
      doc.setFont("Roboto-Light");
      doc.text(subtitle, 8, 4.75 + textHeight / 2, {
        align: "center",
        lineHeightFactor: 1.5,
        maxWidth: 12,
      });
    }
  }

  function addPlacingSlides(name, teams) {
    const eventPlaces = teams.length;
    const sidebarOffset = 4.5 - (sidebarLineHeight * eventPlaces) / 2;

    // this loops through placings backwards to generate slides for each placing in reverse order
    Array(eventPlaces)
      .fill(0)
      .forEach((_, i) => {
        doc.addPage();

        // add sidebar
        doc.setFillColor(bgColor);
        doc.rect(0, 0, 16, 9, "F");
        doc.setFillColor(themeBgColor);
        doc.rect(dividerOffset, 0, 16 - dividerOffset, 9, "F");

        // add event name
        doc.setFontSize(headerFontSize);
        doc.setFont("Roboto-Bold");
        doc.setTextColor(headerTextColor);
        doc.text(name, 0.5, 0.625, { baseline: "top" });
        doc.setDrawColor(themeBgColor);
        doc.setLineWidth(1 / 16);
        doc.line(
          0.5,
          0.875 + headerFontSize / 72,
          2,
          0.875 + headerFontSize / 72
        );

        // add main team name
        // compute height
        doc.setFontSize(teamFontSize);
        doc.setFont("Roboto-Bold");
        doc.setTextColor(textColor);
        const team = teams[eventPlaces - (i + 1)];
        const text = doc.splitTextToSize(
          `${team.school}${team.suffix ? " " + team.suffix : ""}`,
          dividerOffset - 1
        );
        const offset =
          5 - (teamLineHeight * teamFontSize * (text.length + 1)) / 72 / 2; // 72 points per inch
        // add rank and team number
        doc.setFontSize(teamFontSize * 0.875);
        doc.setFont("Roboto-Light");
        doc.text(
          `${ordinalize(eventPlaces - i)}: Team ${team.number}`,
          0.5,
          offset,
          {
            baseline: "middle",
            lineHeightFactor: teamLineHeight,
          }
        );
        // add team name
        doc.setFontSize(teamFontSize);
        doc.setFont("Roboto-Bold");
        doc.text(
          text,
          0.5,
          offset + (teamLineHeight * teamFontSize) / 72 + 0.1,
          {
            baseline: "middle",
            lineHeightFactor: teamLineHeight,
          }
        );

        // add sidebar teams
        doc.setFontSize(sidebarFontSize);
        doc.setFont("Roboto-Regular");
        doc.setTextColor(themeTextColor);
        teams
          .slice(eventPlaces - (i + 1), eventPlaces)
          .reverse()
          .forEach((team, rank) => {
            rank = eventPlaces - rank;
            // split text for truncating if too long
            const text = doc.splitTextToSize(
              `${rank}. ` +
                formatSchool(team) +
                (team.suffix ? " " + team.suffix : ""),
              16 - dividerOffset - 1
            );
            doc.text(
              text[0] + `${text.length > 1 ? "…" : ""} (${team.number})`,
              dividerOffset + 0.5,
              sidebarOffset + (rank - 1) * sidebarLineHeight,
              { baseline: "top", maxWidth: 15 }
            );
          });
      });
  }

  // generate title slide
  doc.outline.add(null, "Welcome", { pageNumber: 1 });
  addTextSlide(
    interpreter1.tournament.year +
      " " +
      tournamentTitle(interpreter1.tournament),
    "Awards Ceremony"
  );

  // generate event placing slides
  const events = interpreter1.events.slice();
  if (interpreter2) {
    events.push(...interpreter2.events);
    // this nonsense sorts the events by name, grouping non-trials (including trialed events) and trials separately
    events.sort((a, b) =>
      a.trial === b.trial
        ? (a.name + " " + a.tournament.division).localeCompare(
            b.name + " " + b.tournament.division
          )
        : a.trial
        ? 1
        : -1
    );
  }
  if (randomOrder) {
    shuffleArray(events);
  }
  const placementOutline = doc.outline.add(null, "Placements");
  events.forEach((event) => {
    const eventPlaces = Math.min(
      event.tournament.medals,
      event.placings.filter(
        (p) =>
          p.participated && (event.trial || !(p.team.exhibition || p.exempt))
      ).length
    );
    const eventName =
      event.name +
      " " +
      event.tournament.division +
      (event.trial ? " (Trial)" : event.trialed ? " (Trialed)" : "");

    addTextSlide(eventName, tournamentName);
    doc.outline.add(placementOutline, eventName, {
      pageNumber: doc.getNumberOfPages(),
    });

    addPlacingSlides(
      eventName,
      event.placings
        .sort((a, b) => a.place - b.place)
        .slice(0, eventPlaces)
        .map((p) => p.team)
    );
  });

  // generate overall placing slides
  const overallTitle =
    "Overall Rankings" +
    (interpreter2 ? `: Division ${interpreter1.tournament.division}` : "");
  addTextSlide(overallTitle, tournamentName);
  doc.outline.add(null, overallTitle, { pageNumber: doc.getNumberOfPages() });
  addPlacingSlides(
    overallTitle,
    interpreter1.teams.slice(0, interpreter1.tournament.trophies)
  );
  if (interpreter2) {
    const overallTitle =
      "Overall Rankings: Division " + interpreter2.tournament.division;
    addTextSlide(overallTitle, tournamentName);
    doc.outline.add(null, overallTitle, { pageNumber: doc.getNumberOfPages() });
    addPlacingSlides(
      overallTitle,
      interpreter2.teams.slice(0, interpreter2.tournament.trophies)
    );
  }

  // generate thank you slide
  addTextSlide("Thank You!", tournamentName);
  doc.outline.add(null, "Thank You!", { pageNumber: doc.getNumberOfPages() });

  return doc.output("bloburi");
};
