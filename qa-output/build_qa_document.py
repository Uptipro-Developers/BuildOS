from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


OUT = "qa-output/BuildOS_QA_Test_Guide_11_to_14_November_2026.docx"
NAVY = "17365D"
BLUE = "D9EAF7"
PALE = "F5F8FB"
GRAY = "D9D9D9"
TEAL = "0F766E"
RED = "B91C1C"


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=100, start=120, bottom=100, end=120):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for margin, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{margin}"))
        if node is None:
            node = OxmlElement(f"w:{margin}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_table_borders(table, color=GRAY, size="6"):
    tbl_pr = table._tbl.tblPr
    borders = tbl_pr.first_child_found_in("w:tblBorders")
    if borders is None:
        borders = OxmlElement("w:tblBorders")
        tbl_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = borders.find(qn(f"w:{edge}"))
        if tag is None:
            tag = OxmlElement(f"w:{edge}")
            borders.append(tag)
        tag.set(qn("w:val"), "single")
        tag.set(qn("w:sz"), size)
        tag.set(qn("w:space"), "0")
        tag.set(qn("w:color"), color)


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def keep_with_next(paragraph):
    paragraph.paragraph_format.keep_with_next = True


def add_table(doc, headers, rows, widths=None, header_fill=NAVY):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_table_borders(table)
    hdr = table.rows[0]
    set_repeat_table_header(hdr)
    for i, label in enumerate(headers):
        cell = hdr.cells[i]
        set_cell_shading(cell, header_fill)
        set_cell_margins(cell)
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(str(label))
        r.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)
        r.font.size = Pt(9)
        if widths:
            cell.width = Inches(widths[i])
    for ridx, values in enumerate(rows):
        cells = table.add_row().cells
        for i, value in enumerate(values):
            cell = cells[i]
            set_cell_margins(cell)
            if ridx % 2:
                set_cell_shading(cell, PALE)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(str(value))
            r.font.size = Pt(9)
            if widths:
                cell.width = Inches(widths[i])
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return table


def add_label_value_table(doc, rows, compact=False):
    table = doc.add_table(rows=0, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_table_borders(table)
    for idx, (label, value) in enumerate(rows):
        cells = table.add_row().cells
        cells[0].width = Inches(1.65)
        cells[1].width = Inches(5.0)
        for cell in cells:
            pad = 35 if compact else 80
            set_cell_margins(cell, top=pad, bottom=pad)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        set_cell_shading(cells[0], BLUE)
        cells[0].paragraphs[0].add_run(label).bold = True
        cells[1].paragraphs[0].add_run(value)
        for cell in cells:
            for run in cell.paragraphs[0].runs:
                run.font.size = Pt(9)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return table


def bullet(doc, text, level=0):
    p = doc.add_paragraph(style="List Bullet" if level == 0 else "List Bullet 2")
    p.add_run(text)
    return p


def numbered(doc, text):
    p = doc.add_paragraph(style="List Number")
    p.add_run(text)
    return p


def result_line(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.2)
    r = p.add_run("Expected  ")
    r.bold = True
    r.font.color.rgb = RGBColor(15, 118, 110)
    p.add_run(text)
    return p


def add_test_case(doc, case):
    h = doc.add_heading(f"{case['id']}  {case['title']}", level=2)
    keep_with_next(h)
    add_label_value_table(doc, [
        ("Area", case["area"]),
        ("Routes", case["routes"]),
        ("Priority", case["priority"]),
        ("Fix verified", case["change"]),
    ])
    p = doc.add_paragraph()
    r = p.add_run("Preconditions  ")
    r.bold = True
    p.add_run(case["pre"])
    h = doc.add_heading("Test steps", level=3)
    keep_with_next(h)
    for step in case["steps"]:
        numbered(doc, step)
    h = doc.add_heading("Expected results", level=3)
    keep_with_next(h)
    for exp in case["expected"]:
        result_line(doc, exp)
    if case.get("regression"):
        p = doc.add_paragraph()
        r = p.add_run("Regression check  ")
        r.bold = True
        r.font.color.rgb = RGBColor(185, 28, 28)
        p.add_run(case["regression"])


doc = Document()
sec = doc.sections[0]
sec.page_width = Inches(8.5)
sec.page_height = Inches(11)
sec.top_margin = Inches(0.72)
sec.bottom_margin = Inches(0.68)
sec.left_margin = Inches(0.78)
sec.right_margin = Inches(0.78)

styles = doc.styles
styles["Normal"].font.name = "Aptos"
styles["Normal"].font.size = Pt(10.5)
styles["Normal"].font.color.rgb = RGBColor(31, 41, 55)
styles["Normal"].paragraph_format.space_after = Pt(6)
styles["Normal"].paragraph_format.line_spacing = 1.08
for name, size in (("Title", 25), ("Heading 1", 17), ("Heading 2", 13), ("Heading 3", 11)):
    s = styles[name]
    s.font.name = "Aptos Display" if name != "Normal" else "Aptos"
    s.font.size = Pt(size)
    s.font.color.rgb = RGBColor(0, 0, 0)
    s.font.bold = True
    s.paragraph_format.space_before = Pt(12 if name != "Title" else 0)
    s.paragraph_format.space_after = Pt(6)
for name in ("List Bullet", "List Bullet 2", "List Number"):
    styles[name].font.name = "Aptos"
    styles[name].font.size = Pt(10.5)
    styles[name].paragraph_format.space_after = Pt(3)

# Header and footer
header = sec.header
hp = header.paragraphs[0]
hp.text = "BuildOS  Quality assurance test guide"
hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
for r in hp.runs:
    r.font.name = "Aptos"
    r.font.size = Pt(8.5)
    r.font.color.rgb = RGBColor(75, 85, 99)
footer = sec.footer
fp = footer.paragraphs[0]
fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
fp.add_run("Development branch  •  Test window 11 to 14 November 2026  •  ")
field = OxmlElement("w:fldSimple")
field.set(qn("w:instr"), "PAGE")
fp._p.append(field)
for r in fp.runs:
    r.font.size = Pt(8)
    r.font.color.rgb = RGBColor(107, 114, 128)

# Cover
doc.add_paragraph().paragraph_format.space_after = Pt(44)
title = doc.add_paragraph(style="Title")
title.alignment = WD_ALIGN_PARAGRAPH.LEFT
title.add_run("BuildOS QA Test Guide")
sub = doc.add_paragraph()
sub.paragraph_format.space_after = Pt(24)
r = sub.add_run("Fixes implemented from 11 November through 14 November 2026")
r.font.size = Pt(15)
r.font.color.rgb = RGBColor(55, 65, 81)

add_label_value_table(doc, [
    ("Product", "BuildOS"),
    ("Branch", "development working state"),
    ("Prepared for", "Product and QA teams"),
    ("Prepared on", "14 November 2026"),
    ("Document status", "Ready for manual QA"),
])

doc.add_paragraph()
p = doc.add_paragraph()
p.add_run("Purpose  ").bold = True
p.add_run("This guide converts the active fixes made during the review window into repeatable QA cases. Each case explains what changed, where to test it, the steps to execute, and the expected result.")
p = doc.add_paragraph()
p.add_run("Main conclusion  ").bold = True
p.add_run("The current working state builds successfully and the focused material and configuration service tests pass. Manual QA is still required for browser workflows, role permissions, lifecycle transitions, notifications, and cross-application visibility.")

doc.add_page_break()

doc.add_heading("1  Scope and verification status", level=1)
p = doc.add_paragraph("The scope is based on the current uncommitted development changes, the database migrations dated 11 to 13 November 2026, and the latest product corrections made through 14 November 2026. The guide follows the final implemented behavior when earlier feedback was superseded.")

add_table(doc, ["Verification", "Result", "Evidence"], [
    ["Frontend production build", "PASS", "Vite build completed successfully on 14 November 2026"],
    ["Backend production build", "PASS", "Nest build completed successfully on 14 November 2026"],
    ["Focused backend tests", "PASS", "35 of 35 tests passed across materials and admin extras services"],
    ["Whitespace and patch validation", "PASS", "git diff check completed without errors"],
    ["Manual browser QA", "PENDING", "Execute the cases in this guide in a migrated test environment"],
], widths=[2.1, 0.8, 3.8])

doc.add_heading("Active scope", level=2)
for item in [
    "Catalogue creation, category selection, automatic SKU display, optional dimensions, material images, aliases, bulk import, and all materials presentation.",
    "Organization-wide material totals and per-store opening stock distribution.",
    "ESS multi-material requests with one destination store, images for new-material requests, and cleaner stock-neutral request UI.",
    "Separate Storefront and Procurement material request approval processes and the handoff between them.",
    "Store availability, reservations, stock transfer allocation, procurement routing, and lifecycle tracking.",
    "Store-specific low and out-of-stock thresholds, controlled stock changes, ledger history, amendment approval, and notifications.",
    "Storefront dashboard navigation and global reference preview modals.",
    "Final visual correction that keeps clickable material names and SKUs black on All Materials.",
]:
    bullet(doc, item)

doc.add_heading("Superseded or excluded work", level=2)
bullet(doc, "Task R2, approval before creating a material, was reverted. QA must confirm that normal material creation is not blocked by the removed R2 approval gate.")
bullet(doc, "The earlier model where Incoming Requests independently approved requests is superseded. Storefront Approvals owns the first approval decision; Incoming Requests is the lifecycle tracking view.")
bullet(doc, "The earlier multi-destination interpretation is superseded. One ESS request selects one destination store; approvers inspect possible source stores and choose the fulfilment route for each line.")
bullet(doc, "The unrelated HR layout modification visible in the worktree is outside this QA document because it is not part of the reviewed Storefront and material change set.")

doc.add_heading("2  Test environment and data", level=1)
doc.add_heading("Environment", level=2)
for item in [
    "Deploy the database migrations through 20261113120000 material request allocation plan.",
    "Run the current frontend and backend from the development working state.",
    "Use a clean browser session and keep the browser console and backend logs available.",
    "Test desktop and one narrow viewport for modal, table, and dashboard responsiveness.",
]:
    bullet(doc, item)

doc.add_heading("Required users and configuration", level=2)
add_table(doc, ["User or record", "Required setup"], [
    ["ESS employee", "Can submit material requests and view My Requests"],
    ["Storefront approver", "Can approve p_storefront_material_requests"],
    ["Procurement approver", "Can approve p_material_requests"],
    ["Store manager or admin", "Can configure stores, thresholds, materials, notifications, and view ledgers"],
    ["Stores", "Store A, Store B, and Destination Store; all active"],
    ["Material", "Test Switch with unit Each; 6 units in Store A and 4 in Store B"],
    ["Configuration", "At least one category, two units of measurement, and notification recipients"],
], widths=[2.0, 4.7])

doc.add_heading("Recommended baseline", level=2)
add_table(doc, ["Store", "On hand", "Reserved", "Available", "Low", "Out"], [
    ["Store A", "6", "0", "6", "3", "0"],
    ["Store B", "4", "0", "4", "2", "0"],
    ["Destination Store", "0", "0", "0", "2", "0"],
    ["Organization total", "10", "0", "10", "Not applicable", "Not applicable"],
], widths=[2.0, 0.8, 0.8, 0.9, 1.0, 1.0])

doc.add_heading("3  Fix inventory", level=1)
add_table(doc, ["ID", "Fix area", "Primary routes"], [
    ["QA CAT 01", "Create material form and catalogue fields", "/apps/storefront/all-materials"],
    ["QA CAT 02", "Dimensions, images, aliases, and table display", "/apps/storefront/all-materials"],
    ["QA CAT 03", "Bulk material import", "/apps/storefront/all-materials"],
    ["QA STK 01", "Opening stock split and organization totals", "All Materials, General Store, Project Stores"],
    ["QA STK 02", "Edit material store allocation and persistence", "All Materials, Project Stores"],
    ["QA ESS 01", "Multi-material request and destination store", "/apps/ess/submit"],
    ["QA ESS 02", "New-material picture and request visibility", "ESS, My Requests, Storefront, Procurement"],
    ["QA WFL 01", "Separate workflow configuration", "/apps/admin/project-config"],
    ["QA WFL 02", "Storefront approval availability and route display", "/apps/storefront/approvals"],
    ["QA WFL 03", "Stock movement allocation and reservation", "Storefront Approvals and Stock Movement"],
    ["QA WFL 04", "Procurement forwarding and second approval", "Storefront and Procurement"],
    ["QA WFL 05", "Incoming Requests lifecycle tracking", "/apps/storefront/incoming-requests"],
    ["QA THR 01", "Store thresholds and stock status", "/apps/storefront/config"],
    ["QA AUD 01", "Material amendment approval", "All Materials and Approvals"],
    ["QA AUD 02", "Stock ledger signs and balances", "GRN, transfers, receipts, returns"],
    ["QA NTF 01", "Low, out, and restored notifications", "Admin Notifications and ESS"],
    ["QA UI 01", "Storefront dashboard drill-down navigation", "/apps/storefront"],
    ["QA UI 02", "Global reference previews", "Procurement, Storefront, other reference views"],
    ["QA UI 03", "All Materials clickable text color", "/apps/storefront/all-materials"],
], widths=[1.0, 3.0, 2.7])

doc.add_page_break()
doc.add_heading("4  Detailed test cases", level=1)

cases = [
    {
        "id": "QA CAT 01", "title": "Create a material with catalogue controlled fields",
        "area": "Catalogue and materials", "routes": "/apps/storefront/all-materials", "priority": "High",
        "change": "The redundant Item Name section was removed. Material Name is the primary name, the generated SKU is displayed beside it, category selection is searchable while still showing options before typing, and dimensions are optional.",
        "pre": "At least one active material category has an SKU prefix and sequence; Units of Measurement are configured.",
        "steps": [
            "Open All Materials and select Add Material.",
            "Open the category control without typing and confirm the category list is visible.",
            "Type part of a category name and choose the filtered result.",
            "Enter a material name and inspect the SKU area beside the name.",
            "Leave dimensions empty, complete all other required values, allocate a small opening quantity, and save.",
            "Reload the page and search for the created material.",
        ],
        "expected": [
            "There is no separate Item Name field.",
            "The category control works as both a dropdown and a search field.",
            "A category-based SKU is generated and is not duplicated.",
            "The material saves without a dimension and remains visible after reload.",
        ],
        "regression": "Creating a material must not enter the reverted Task R2 pending-approval queue.",
    },
    {
        "id": "QA CAT 02", "title": "Show dimensions pictures aliases and thresholds consistently",
        "area": "Catalogue presentation", "routes": "/apps/storefront/all-materials", "priority": "High",
        "change": "Material pictures appear beside names; dimensions appear below the material name; aliases are searchable; the table shows stock threshold information; Units of Measurement supply dimension units.",
        "pre": "Create or edit a material with a JPG, PNG, or WebP picture, two dimensions, one alias, and stock held by at least one store.",
        "steps": [
            "Open the material create or edit form and add a picture.",
            "Add two dimensions and choose units from the configured Units of Measurement list.",
            "Add an alias and save.",
            "Reload All Materials, then inspect the material row.",
            "Search by the alias rather than the canonical name.",
        ],
        "expected": [
            "The image thumbnail is visible beside the material name.",
            "The configured dimensions are displayed beneath the name and persist after reload.",
            "Only configured measurement units are offered.",
            "Searching an alias returns the canonical material without creating a duplicate.",
            "The stock threshold column reflects the configured store context or indicates that thresholds vary by store.",
        ],
    },
    {
        "id": "QA CAT 03", "title": "Import multiple materials from the template",
        "area": "Bulk catalogue creation", "routes": "/apps/storefront/all-materials", "priority": "Medium",
        "change": "The Import Materials flow downloads a template, validates uploaded rows, creates valid materials, and reports row-level failures.",
        "pre": "Prepare one valid file and one file containing a missing category or malformed numeric value.",
        "steps": [
            "Select Import Materials and download the supplied template.",
            "Populate at least three valid rows under configured categories and upload the file.",
            "Confirm the import and search for all created rows.",
            "Upload the invalid file.",
        ],
        "expected": [
            "All valid rows are created with unique category-based SKUs.",
            "Imported materials persist after reload.",
            "Invalid rows are reported with useful row-level errors and do not silently create broken records.",
        ],
        "regression": "The import must not overwrite existing materials or reuse an existing SKU.",
    },
    {
        "id": "QA STK 01", "title": "Split opening stock across stores without duplicating organization stock",
        "area": "Stock ownership and totals", "routes": "/apps/storefront/all-materials, /apps/storefront/general-store, /apps/storefront/project-stores", "priority": "Critical",
        "change": "A material is one organization-wide catalogue record. StoreItem records hold physical quantities. General Store displays the roll-up across stores rather than a second physical quantity.",
        "pre": "Use a new material and active Store A and Store B.",
        "steps": [
            "Create the material with 6 units assigned to Store A and 4 assigned to Store B.",
            "Open Project Stores and inspect both stores.",
            "Open General Store and locate the material.",
            "Return to All Materials and compare Total, Reserved, and Available quantities.",
        ],
        "expected": [
            "Store A shows 6 and Store B shows 4.",
            "General Store and All Materials show an organization total of 10, not 20.",
            "The organization roll-up uses All stores wording and does not behave like another source store.",
            "Available equals total minus reserved.",
        ],
        "regression": "Reload every page and confirm totals remain unchanged.",
    },
    {
        "id": "QA STK 02", "title": "Add opening stock to another store while editing a material",
        "area": "Material edit and store persistence", "routes": "/apps/storefront/all-materials and /apps/storefront/project-stores", "priority": "Critical",
        "change": "Editing a material can add an opening allocation to a store that does not yet hold it. Existing live store quantities are protected from arbitrary edits, and unit values are normalized to avoid the previous null-unit transaction error.",
        "pre": "A material exists in Store A only; Store B has no StoreItem for it.",
        "steps": [
            "Edit the material from All Materials.",
            "Add 5 units to Store B and save.",
            "Reload All Materials and Project Stores.",
            "Attempt to overwrite the established Store A live quantity through the material edit form.",
        ],
        "expected": [
            "The save completes without a Prisma transaction or null-unit error.",
            "Store B now shows 5 units and the organization total increases by 5.",
            "The established Store A quantity is read-only or unchanged; later changes must use a controlled stock transaction.",
        ],
    },
    {
        "id": "QA ESS 01", "title": "Submit one request containing multiple materials to one destination store",
        "area": "Employee Self Service material request", "routes": "/apps/ess/submit and /apps/ess/my-requests", "priority": "Critical",
        "change": "The form supports multiple rows, requires one destination store, no longer shows in-stock or out-of-stock tags, and no longer blocks an out-of-stock selection with the old message.",
        "pre": "Sign in as an ESS employee; at least three catalogue materials and one destination store exist.",
        "steps": [
            "Open Submit Request and choose Material Request.",
            "Choose a destination store.",
            "Add three material rows with quantities and units.",
            "Select one material that currently has zero available stock.",
            "Submit and open My Requests.",
        ],
        "expected": [
            "Add Material Row works without the addMaterialRow is not defined error.",
            "No in-stock or out-of-stock tags appear in the material field and no blocking Out of Stock message appears.",
            "One request group is created with all three lines and the selected destination store.",
            "The request appears in My Requests and Storefront Approvals as Pending Approval.",
        ],
    },
    {
        "id": "QA ESS 02", "title": "Upload a picture when requesting a new material",
        "area": "New material request", "routes": "/apps/ess/submit, /apps/ess/my-requests, /apps/storefront/incoming-requests, /apps/procurement/material-requests", "priority": "High",
        "change": "New-material requests carry an uploaded image through ESS, Storefront tracking, and Procurement views. Image type and approximate size are validated.",
        "pre": "Prepare a small supported image and an unsupported or oversized file.",
        "steps": [
            "Start a new-material request, enter the description and attach the supported image.",
            "Submit and inspect the request in My Requests and Storefront.",
            "If routed to Procurement, inspect it in the Procurement request view.",
            "Repeat with the unsupported or oversized file.",
        ],
        "expected": [
            "The supported image uploads, persists after reload, and displays with the material request wherever needed.",
            "The same original request reference is retained across views.",
            "Unsupported or oversized image data is rejected with a clear validation message.",
        ],
    },
    {
        "id": "QA WFL 01", "title": "Configure independent Storefront and Procurement approval workflows",
        "area": "Admin process configuration", "routes": "/apps/admin/project-config", "priority": "Critical",
        "change": "Storefront Material Request Approval and Procurement Material Request Approval have distinct process identifiers instead of selecting the same process and returning Workflow already exists.",
        "pre": "Use an admin account. Know the intended approver for each process.",
        "steps": [
            "Open Project Configuration and start creating a Storefront Material Request Approval workflow.",
            "Assign the Storefront approver and save.",
            "Create or inspect the Procurement Material Request Approval workflow and assign its approver.",
            "Reload the configuration list.",
        ],
        "expected": [
            "Storefront uses p_storefront_material_requests and Procurement uses p_material_requests.",
            "Creating one does not select, overwrite, or falsely collide with the other.",
            "Both workflows appear separately with their correct application and approver.",
        ],
    },
    {
        "id": "QA WFL 02", "title": "Review availability and retain the approval decision",
        "area": "Storefront material request approval", "routes": "/apps/storefront/approvals", "priority": "Critical",
        "change": "The approval modal presents each requested material as a compact card, shows organization and per-store quantities, requires a fulfilment route, and displays the chosen route after approval.",
        "pre": "Submit a multi-line ESS request for Destination Store. Store A and Store B hold different quantities.",
        "steps": [
            "Open the pending material request in Storefront Approvals.",
            "Inspect every material card and the available stores list.",
            "Try to approve without choosing a route for a line.",
            "Choose a valid route for each line and complete approval.",
            "Reopen or inspect the approved request.",
        ],
        "expected": [
            "Long lists remain usable through compact cards and an internally scrollable content area rather than an excessively tall dialog.",
            "Each card shows on-hand, reserved, and available quantities per store and the organization total.",
            "Approval is blocked until every line has a fulfilment decision.",
            "The approved destination, Stock Movement or Procurement, remains visible after approval and reload.",
        ],
    },
    {
        "id": "QA WFL 03", "title": "Reserve and fulfil a line through stock movement",
        "area": "Storefront allocation and transfer", "routes": "/apps/storefront/approvals and /apps/storefront/stock-movement", "priority": "Critical",
        "change": "A stock route selects a physical source store, reserves its quantity, prevents over-allocation, creates a transfer to the request destination, and releases or consumes the reservation according to the transfer outcome.",
        "pre": "Request 4 Test Switch units to Destination Store; Store A has 6 available.",
        "steps": [
            "In Storefront Approvals choose Stock Movement and Store A for the line.",
            "Approve the request and inspect Store A immediately.",
            "Try to allocate another request beyond Store A available quantity.",
            "Open Stock Movement and complete the generated transfer.",
            "Inspect source, destination, All Materials, and Incoming Requests.",
        ],
        "expected": [
            "Four units are reserved at approval and no competing approval can consume the same available stock.",
            "A transfer references the original ESS request and targets Destination Store.",
            "On completion, Store A decreases by 4, Destination Store increases by 4, and the reservation returns to zero.",
            "Incoming Requests becomes Fulfilled via Storefront only after actual transfer fulfilment, not merely after approval.",
        ],
        "regression": "Rejecting or cancelling before fulfilment must release the reservation without changing on-hand stock.",
    },
    {
        "id": "QA WFL 04", "title": "Forward a line to Procurement and apply Procurement approval",
        "area": "Cross-application material request handoff", "routes": "Storefront Approvals, Procurement Material Requests, Procurement Approvals", "priority": "Critical",
        "change": "Storefront remains the first approver. Procurement receives only lines routed to procurement and applies its independent p_material_requests approval before operational processing.",
        "pre": "Submit a request for a line that cannot be fulfilled from another physical store.",
        "steps": [
            "Approve the line for Procurement in Storefront.",
            "Open Procurement Material Requests and locate it by the original ESS reference.",
            "Inspect quantity, requester, destination store, and image if present.",
            "Open Procurement Approvals and approve with the configured Procurement approver.",
            "Advance procurement processing and complete the associated receipt when available.",
        ],
        "expected": [
            "Only the procurement-routed line and quantity are handed to Procurement.",
            "The original ESS reference and destination store remain attached.",
            "The Procurement workflow is required and is independent of Storefront approval.",
            "Storefront Incoming Requests updates from Forwarded to Procurement to Procurement In Progress and finally Fulfilled via Procurement.",
        ],
        "regression": "The same line must never be active in both Stock Movement and Procurement at the same time.",
    },
    {
        "id": "QA WFL 05", "title": "Track the full request lifecycle in Incoming Requests",
        "area": "Lifecycle tracking", "routes": "/apps/storefront/incoming-requests", "priority": "High",
        "change": "Incoming Requests is an information and tracking centre, not an independent approval engine. It groups related lines and reflects Storefront and Procurement progress.",
        "pre": "Create one stock-movement request, one procurement request, one rejected request, and one multi-line request using both routes.",
        "steps": [
            "Open Incoming Requests after each workflow transition.",
            "Filter or search by original request reference.",
            "Open each request detail and compare its route, status, and downstream references.",
            "Reload after transfer or procurement updates.",
        ],
        "expected": [
            "Statuses reflect Pending Approval, Forwarded to Procurement, Procurement In Progress, Fulfilled via Procurement, Fulfilled via Storefront, or Rejected as appropriate.",
            "The page does not offer a competing first approval action.",
            "Multi-line requests retain all child lines and can represent their current mixed progress without losing the base ESS reference.",
            "Status changes persist after reload.",
        ],
    },
    {
        "id": "QA THR 01", "title": "Configure store-specific low and out-of-stock thresholds",
        "area": "Stock thresholds and status color", "routes": "/apps/storefront/config?tab=thresholds, General Store, Project Stores, All Materials", "priority": "Critical",
        "change": "Stock Thresholds is available in Storefront Config. Defaults and store or item overrides drive in-stock, low-stock, and out-of-stock states; two stores may use different thresholds for the same material.",
        "pre": "The same material exists in Store A and Store B.",
        "steps": [
            "Open Storefront Config and select Stock Thresholds.",
            "Set Store A low threshold to 3 and out threshold to 0; set Store B low threshold to 8 and out threshold to 1.",
            "Save and reload configuration.",
            "Set both stores to quantity 5 using legitimate transactions and inspect their statuses.",
            "Move each quantity across its low, out, and restored boundaries.",
        ],
        "expected": [
            "Thresholds persist per store or store-item.",
            "At quantity 5, Store A is in stock while Store B is low stock.",
            "Low and out states use the defined warning or danger color treatment and low-stock values are red where shown.",
            "The state changes only when a posted stock transaction crosses the configured boundary.",
        ],
    },
    {
        "id": "QA AUD 01", "title": "Require approval for edits to an established material",
        "area": "Material change control", "routes": "/apps/storefront/all-materials and /apps/storefront/approvals", "priority": "High",
        "change": "Edits to established material data create a Material Amendment. The live record stays unchanged until the amendment is approved, and the request retains old and proposed values plus audit identities.",
        "pre": "Use an established material and separate requester and approver accounts.",
        "steps": [
            "Edit a material attribute such as name, category, unit, dimensions, aliases, or picture and submit a reason.",
            "Reload All Materials before approval.",
            "Open the approval queue and inspect the amendment comparison.",
            "Approve it, then reload All Materials.",
            "Submit a second change and reject it.",
        ],
        "expected": [
            "Before approval, the live material retains its old value and a pending amendment exists.",
            "The queue shows old value, proposed value, reason, requester, date, and entity reference.",
            "Approval applies the proposed value once; rejection leaves the live value unchanged.",
            "Both outcomes remain auditable.",
        ],
        "regression": "Direct quantity editing remains unavailable for established stock; use receipts, issues, returns, or transfers.",
    },
    {
        "id": "QA AUD 02", "title": "Validate signed stock movements and the immutable ledger",
        "area": "Stock integrity", "routes": "Goods Receipt, Stock Movement, Returns, Receipts, stock history", "priority": "Critical",
        "change": "Posted movements record before quantity, after quantity, direction, status, related document type, and related ID. Receipts add stock; issues and transfers out subtract stock; transfer receipts and approved returns add stock.",
        "pre": "Choose a material with a known baseline and access to GRN, transfer, return, and receipt workflows.",
        "steps": [
            "Post a supplier GRN for +10 and record the balance.",
            "Dispatch a transfer of 3 and complete its receipt at another store.",
            "Post a valid return of 2 to stock.",
            "Inspect ledger entries after each event.",
            "Repeat or refresh actions to check idempotency where supported.",
        ],
        "expected": [
            "The GRN adds 10 to the destination store.",
            "Transfer dispatch subtracts 3 from the source and receipt adds 3 to the destination, with organization total unchanged by the internal movement.",
            "The approved return adds 2 exactly once.",
            "Each entry contains matching before and after balances, direction, posted status, and related reference.",
            "No refresh or repeated completion creates a duplicate posting.",
        ],
    },
    {
        "id": "QA NTF 01", "title": "Dispatch low out and restored stock notifications",
        "area": "Notifications", "routes": "/apps/admin/notifications, Email Configuration, /apps/ess", "priority": "High",
        "change": "The dispatcher supports stock.low, stock.out, and stock.restored events. It targets Storefront primary contacts and store managers through configured in-app and email channels and respects notification configuration.",
        "pre": "Configure recipients, enable the relevant notification rules, and set a known store threshold.",
        "steps": [
            "Post a stock movement that changes the item from in stock to low stock.",
            "Post another movement that changes it to out of stock.",
            "Post a receipt that restores it above the low threshold.",
            "Inspect ESS or in-app notifications and the email delivery log or configured mailbox.",
            "Disable or mute the rule and cross a boundary again.",
        ],
        "expected": [
            "One appropriate notification is produced for each actual boundary crossing.",
            "Recipients include the configured Storefront or store contacts, not unrelated users.",
            "The notification identifies the material, store, quantity, threshold state, and source reference where available.",
            "A disabled or muted rule suppresses delivery.",
        ],
        "regression": "Repeated reads or saves without a threshold crossing must not send duplicate alerts.",
    },
    {
        "id": "QA UI 01", "title": "Navigate from Storefront dashboard statistics to source pages",
        "area": "Dashboard drill-down", "routes": "/apps/storefront", "priority": "Medium",
        "change": "Dashboard KPI cards and key activity references are clickable and lead to the page that owns the underlying data.",
        "pre": "Populate stores, materials, pending requests, transfers, and low-stock data.",
        "steps": [
            "Click Total Stores, Stock Value, Available Materials, Pending Requests, Approved Transfers, and Low Stock in turn.",
            "Return to the dashboard after each navigation.",
            "Click a store card, a transfer row or status, and View All Transfers.",
        ],
        "expected": [
            "Each KPI opens the appropriate Stores Config, General Store, All Materials, Incoming Requests, or Stock Movement page.",
            "Store cards open the relevant store view.",
            "Transfer references open Stock Movement without dead links.",
            "Keyboard focus and hover state make clickable regions identifiable.",
        ],
    },
    {
        "id": "QA UI 02", "title": "Open summary previews for recognized references",
        "area": "Global reference visibility", "routes": "Procurement, Storefront, Finance, and other pages containing supported references", "priority": "High",
        "change": "A global reference preview opens a modal for supported GRN, PO, PR, RFQ, invoice, material request, transfer, material or SKU, journal, payment, and transaction references.",
        "pre": "Create at least one record of each available supported reference type.",
        "steps": [
            "Click a GRN reference and verify its summary and status.",
            "Repeat for PO, PR, material request, transfer, and material or SKU references.",
            "Test a reference displayed inside an existing link or table cell.",
            "Click ordinary navigation labels beginning with a supported prefix, especially Process Configuration.",
            "Close the modal by its close action and by the supported outside or Escape behavior.",
        ],
        "expected": [
            "The preview opens without leaving the current page.",
            "The modal resolves the exact record and displays meaningful status, key fields, and line items.",
            "An unsupported or missing reference fails gracefully and does not crash the page.",
            "Process Configuration navigates to /apps/admin/project-config and does not open a PR reference preview.",
            "The modal is usable by keyboard and does not trap the page after closing.",
        ],
    },
    {
        "id": "QA UI 03", "title": "Keep clickable material names and SKUs black",
        "area": "All Materials visual consistency", "routes": "/apps/storefront/all-materials", "priority": "Low",
        "change": "Material names and SKU reference links remain black in normal and hover states while retaining click behavior.",
        "pre": "At least one material has a SKU and can be resolved by the reference preview.",
        "steps": [
            "Open All Materials and inspect a material name and SKU before interaction.",
            "Hover and keyboard-focus each link.",
            "Click the name, close the preview, then click the SKU.",
        ],
        "expected": [
            "Both texts are black in the normal and hover states, not the default link blue.",
            "A visible focus indicator remains available for keyboard users.",
            "Both links still open the correct material summary preview.",
        ],
    },
]

for case in cases:
    add_test_case(doc, case)

doc.add_heading("5  Status and ownership matrix", level=1)
add_table(doc, ["Event", "Incoming Requests status", "Operational owner"], [
    ["ESS submission", "Pending Approval", "Storefront approval"],
    ["Approved for stock route", "Approved for Stock Movement or active transfer state", "Storefront"],
    ["Transfer actually completed", "Fulfilled via Storefront", "Storefront"],
    ["Approved for procurement", "Forwarded to Procurement", "Procurement queue"],
    ["Procurement work started", "Procurement In Progress", "Procurement"],
    ["Procurement receipt completed", "Fulfilled via Procurement", "Procurement with Storefront tracking"],
    ["Storefront rejection", "Rejected", "Storefront"],
], widths=[2.3, 2.4, 2.0])

doc.add_heading("6  End to end acceptance scenarios", level=1)
doc.add_heading("Scenario A  Fully fulfilled from stock", level=2)
for text in [
    "Employee submits two materials to one destination store.",
    "Storefront approver sees organization and per-store availability.",
    "Approver selects a physical source store for each line and approves.",
    "System reserves quantities and creates linked transfers.",
    "Transfers complete; source decreases, destination increases, reservations clear, and tracking becomes Fulfilled via Storefront.",
]: numbered(doc, text)

doc.add_heading("Scenario B  Fully fulfilled through procurement", level=2)
for text in [
    "Employee submits a material to a destination store.",
    "Storefront approver routes the line to Procurement.",
    "Procurement receives the original reference and applies its own workflow approval.",
    "Processing changes tracking to Procurement In Progress.",
    "Receipt posts positive stock to the destination and tracking becomes Fulfilled via Procurement.",
]: numbered(doc, text)

doc.add_heading("Scenario C  Multi-line request with different routes", level=2)
for text in [
    "Employee submits at least two lines under one request reference.",
    "Storefront approver routes one whole line to Stock Movement and another whole line to Procurement.",
    "The stock line creates a transfer while only the procurement line appears in Procurement.",
    "Incoming Requests retains the base ESS reference and reflects progress until both lines finish.",
]: numbered(doc, text)

doc.add_heading("Scenario D  Threshold and audit integrity", level=2)
for text in [
    "Configure different thresholds for the same material in two stores.",
    "Post receipts and issues across each boundary and verify status colors and notifications.",
    "Confirm ledger signs, before and after balances, and related references.",
    "Submit a catalogue amendment and verify the live record changes only after approval.",
]: numbered(doc, text)

doc.add_heading("7  Regression checklist", level=1)
for item in [
    "No runtime exception appears in ESS when adding a material row.",
    "No Prisma transaction error appears when saving store allocations.",
    "No duplicate catalogue SKU is generated during manual or bulk creation.",
    "A material is not counted twice by treating General Store as additional physical stock.",
    "Reserved quantity never exceeds available source stock and is released on cancel or reject.",
    "A request line cannot be processed through Stock Movement and Procurement simultaneously.",
    "Storefront and Procurement workflow configurations remain distinct after reload.",
    "Images persist after reload and unsupported payloads are rejected.",
    "Quantity changes come from posted movements rather than direct edits.",
    "Threshold events are generated once per state transition, not once per page load.",
    "Reference previews do not interfere with ordinary buttons, form fields, or external links.",
    "All Materials reference links remain black and accessible.",
]:
    bullet(doc, "☐ " + item)

doc.add_heading("8  Defect reporting template", level=1)
add_label_value_table(doc, [
    ("Test case", "Example QA WFL 03"),
    ("Environment", "Branch, backend build, frontend build, database migration level, browser"),
    ("Preconditions", "User role, workflow setup, stores, material quantities, threshold configuration"),
    ("Steps", "Numbered reproduction steps using exact references and quantities"),
    ("Actual result", "Observed UI, status, quantity, route, API response, and log message"),
    ("Expected result", "Expected result copied from this guide"),
    ("Evidence", "Screenshot, video, request or response, backend log, and affected record reference"),
    ("Severity", "Critical, High, Medium, or Low"),
], compact=True)

p = doc.add_paragraph()
p.add_run("Release recommendation  ").bold = True
p.add_run("Do not promote the change set until all Critical cases pass, no open High defect can corrupt stock or route a request incorrectly, and the final quantities reconcile across Store Items, General Store roll-up, All Materials, and the stock ledger.")

doc.add_heading("9  QA sign off", level=1)
add_table(doc, ["Role", "Name", "Date", "Result or signature"], [
    ["QA executor", "", "", ""],
    ["Product owner", "", "", ""],
    ["Engineering", "", "", ""],
], widths=[1.6, 1.8, 1.3, 2.0])

doc.core_properties.title = "BuildOS QA Test Guide"
doc.core_properties.subject = "Fixes implemented from 11 to 14 November 2026"
doc.core_properties.author = "BuildOS Engineering"
doc.core_properties.keywords = "BuildOS, QA, Storefront, materials, stock, approvals, procurement"

doc.save(OUT)
print(OUT)
