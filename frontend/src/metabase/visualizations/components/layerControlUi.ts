import type L from "leaflet";

// Enhances the grouped layer control (third-party leaflet plugin DOM) with
// select all / clear all buttons and collapsible group headers. Styled by
// CarinaLayerControl.css.
export function initLayerControlUi(
  formElement: HTMLFormElement,
  clusterLayers: Record<number, L.Layer>,
  map: L.Map,
): void {
  const toggleMarkup = `
    <div class="master-toggle-panel">
      <button type="button" class="toggle-btn btn-on master-toggle-all-on">Select All</button>
      <button type="button" class="toggle-btn btn-off master-toggle-all-off">Clear All</button>
    </div>
  `;
  formElement.insertAdjacentHTML("afterbegin", toggleMarkup);

  const allOnBtn = formElement.querySelector(".master-toggle-all-on");
  const allOffBtn = formElement.querySelector(".master-toggle-all-off");

  const setAllCheckboxes = (checked: boolean) => {
    formElement
      .querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
      .forEach((checkbox) => {
        checkbox.checked = checked;
      });
  };

  allOnBtn?.addEventListener("click", () => {
    Object.values(clusterLayers).forEach((cluster) => {
      if (!map.hasLayer(cluster)) {
        map.addLayer(cluster);
      }
    });
    setAllCheckboxes(true);
  });

  allOffBtn?.addEventListener("click", () => {
    Object.values(clusterLayers).forEach((cluster) => {
      if (map.hasLayer(cluster)) {
        map.removeLayer(cluster);
      }
    });
    setAllCheckboxes(false);
  });

  const groups = formElement.querySelectorAll(".leaflet-control-layers-group");
  groups.forEach((group) => {
    const header = group.querySelector(".leaflet-control-layers-group-name");
    if (!header) {
      return;
    }

    header.classList.add("accordion-header", "open");
    header.insertAdjacentHTML(
      "beforeend",
      '<span class="accordion-arrow">▼</span>',
    );

    header.addEventListener("click", () => {
      const isCurrentlyOpen = header.classList.contains("open");

      header.classList.toggle("open", !isCurrentlyOpen);
      header.classList.toggle("collapsed", isCurrentlyOpen);

      const arrowSpan = header.querySelector(".accordion-arrow");
      if (arrowSpan) {
        arrowSpan.textContent = isCurrentlyOpen ? "▶" : "▼";
      }

      group.querySelectorAll("label").forEach((label) => {
        label.style.display = isCurrentlyOpen ? "none" : "flex";
      });
    });
  });
}
