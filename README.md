# SalesDoor Enterprise — Company-Wide Task Management System

Upgraded from SalesDoor Pro into a complete corporate-wide hierarchical task assignment, tracking, approval, and reporting system.

---

## 1. Complete Organizational Hierarchy Implemented

The organizational structure is modeled in [src/orgStructure.js](file:///R:/stark%20task/src/orgStructure.js):

- **Executive Director**: Dr. Arjan Singhania (Company-wide visibility & override governance)
- **General Manager**: Rajiv Mehra (Company-wide task distribution & operations monitoring)

### Departments & Roles:
1. **HR & Administration**:
   - HR Manager (`Sunita Menon`) → HR Executive (`Ananya Roy`)
   - Admin Manager (`Ramesh Kulkarni`) → Admin Executive (`Suresh Nayak`)
   - IT Head (`Anand Verma`)
   - Housekeeping (`Manoj Kumar`)
2. **Finance & Accounts**:
   - Accounts Manager (`Vipin Chandran`) → Accountants (`Pooja Hegde`, `Manish Tiwari`)
3. **Operations**:
   - **Warehouse**: Warehouse In-charge (`Harish Chandra`) → Warehouse Supervisor (`Balram Yadav`) → Loading Staff (`Devender Das`)
   - **Transportation**: Transport Manager (`Capt. Gurpreet Singh`) → Transport Coordinator (`Karthik Raja`) → Drivers (`Shamshad Ali`)
   - **Service**: Service Manager (`Ranganathan Iyer`) → Service Coordinator (`Vikas Deshmukh`) → Technicians (`Naveen Pradhan`)
   - **Inventory**: Inventory Supervisor (`Dinesh Nambiar`) → Storekeeper (`Raghu Ram`)
   - Operations Assistant (`Geeta Sen`)
4. **Sales (Preserves dealer call & door tracking)**:
   - CSO (`Vikramaditya Oberoi`) → SSM (`Deepak Saxena`) → ASM (`Siddharth Kaul`) → Sales Coordinators (`Rahul Sharma`, `Priya Patel`)
5. **Marketing**:
   - Brand Manager (`Neha Kapoor`) → Leads Coordinator (`Tanvi Shah`) → Graphic Designer (`Arjun Das`) & Photographer (`Kunal Roy`)

---

## 2. Hierarchical Task Assignment Engine ([src/TaskAssignmentModal.jsx](file:///R:/stark%20task/src/TaskAssignmentModal.jsx))
- **Assign to Individual or Teams / Multi-employees**.
- **Assign to subordinate managers or frontline staff** based on organizational tier.
- **Cross-department task assignment** supported with visibility for reporting managers.
- **Priority settings**: Low, Medium, High, Urgent.
- **Deadlines & Recurring Engine**: Daily, Weekly, Monthly, or One-time tasks.
- **Deliverables definition**: Expected completion result and step-by-step instructions.
- **Reviewer designation**: Select review/approval manager per task.

---

## 3. Employee Task Dashboard ([src/App.jsx](file:///R:/stark%20task/src/App.jsx))
Filterable sub-views:
- **All Tasks**
- **Today's Tasks**
- **In Progress**
- **Pending / Accepted**
- **Overdue**
- **Completed**
- **Blocked**

Employees can accept tasks, update progress percentages, add execution remarks, upload completion evidence/receipts, report blockers, and submit work for supervisor sign-off.

---

## 4. Multi-Stage Approval Workflow ([src/SupervisorApprovalModal.jsx](file:///R:/stark%20task/src/SupervisorApprovalModal.jsx))
```
Manager Creates Task 
  → Assigns Employee 
  → In-App Notification 
  → Employee Accepts 
  → In Progress Updates 
  → Completion Submission 
  → Supervisor Review 
  → [Approve & Complete] OR [Request Correction with Mandatory Reason]
```

---

## 5. Daily Dealer Call Locking & Audit System
- **Preserved SalesDoor Pro daily dealer call locking**: Dealer call tasks assigned today remain editable until **11:59:59 PM**. After midnight, they permanently switch to **Locked (Read-Only)** for sales executives.
- **Immutable Audit Trail**: Append-only log recording who created, updated, submitted, approved, or rejected tasks.
- **Firestore Security Rules**: Configured in [firestore.rules](file:///R:/stark%20task/firestore.rules) to block backdated modifications and enforce role permissions.

---

## 6. Corporate Identity & Responsive UI
- **Primary Brand Color**: `#05331F` (Forest Green).
- **Surface**: Clean white cards with slate borders and subtle shadows.
- **Role Simulation Switcher**: Switch between any user across the whole company directly in the navigation bar to preview access restrictions.

---

## 7. How to Run

```bash
npm run dev
```
Open `http://localhost:5173` in your browser.
