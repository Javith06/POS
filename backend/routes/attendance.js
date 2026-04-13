const express = require("express");
const router = express.Router();
const sql = require("mssql");
const { poolPromise } = require("../config/db");
const crypto = require("crypto");

router.post("/track", async (req, res) => {
  try {
    const pool = await poolPromise;
    const {
      employeeId,
      employeeName,
      action, // "START", "BREAK_IN", "BREAK_OUT", "END"
      timestamp,
      businessUnitId,
      userId,
    } = req.body;

    if (!employeeId || !action) {
      return res.status(400).json({ error: "Missing employeeId or action" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate a consistent UUID from the employeeId string
    const hash = crypto.createHash("md5").update(employeeId).digest("hex");
    const formattedUUID = [
      hash.substring(0, 8),
      hash.substring(8, 12),
      hash.substring(12, 16),
      hash.substring(16, 20),
      hash.substring(20, 32),
    ].join("-");

    // Check if attendance record exists for today
    const result = await pool
      .request()
      .input("EmployeeId", formattedUUID)
      .input("TodayDate", today).query(`
        SELECT TOP 1 *
        FROM DailyAttendance
        WHERE DeliveryPersonId = @EmployeeId 
        AND CAST(CreatedOn AS DATE) = CAST(@TodayDate AS DATE)
      `);

    const existingRecord = result.recordset?.[0];
    const currentTime = timestamp ? new Date(timestamp) : new Date();

    if (action === "START") {
      if (!existingRecord) {
        const businessUUID = businessUnitId || "00000000-0000-0000-0000-000000000000";
        const createdByUUID = userId || "00000000-0000-0000-0000-000000000000";
        
        await pool.request()
          .input("DeliveryPersonId", formattedUUID)
          .input("EmployeeName", employeeName || "Unknown")
          .input("StartDateTime", currentTime)
          .input("BusinessUnitId", businessUUID)
          .input("CreatedBy", createdByUUID)
          .input("CreatedOn", new Date())
          .query(`
            INSERT INTO DailyAttendance (DeliveryPersonId, EmployeeName, StartDateTime, BusinessUnitId, CreatedBy, CreatedOn, NoofTrips, TotalAmount, IsPaid)
            VALUES (@DeliveryPersonId, @EmployeeName, @StartDateTime, @BusinessUnitId, @CreatedBy, @CreatedOn, 0, 0, 0)
          `);
      }
    } else if (action === "BREAK_IN") {
      if (existingRecord) {
        await pool.request()
          .input("Id", existingRecord.AttendanceId)
          .input("Time", currentTime)
          .query(`UPDATE DailyAttendance SET BreakInTime = @Time WHERE AttendanceId = @Id`);
      }
    } else if (action === "BREAK_OUT") {
      if (existingRecord) {
        await pool.request()
          .input("Id", existingRecord.AttendanceId)
          .input("Time", currentTime)
          .query(`UPDATE DailyAttendance SET BreakOutTime = @Time WHERE AttendanceId = @Id`);
      }
    } else if (action === "END") {
      if (existingRecord) {
        const start = new Date(existingRecord.StartDateTime);
        const diffHours = Math.abs(currentTime - start) / 36e5;
        
        await pool.request()
          .input("Id", existingRecord.AttendanceId)
          .input("Time", currentTime)
          .input("Hours", parseFloat(diffHours.toFixed(2)))
          .query(`UPDATE DailyAttendance SET EndDateTime = @Time, NoofHours = @Hours WHERE AttendanceId = @Id`);
      }
    }

    console.log(`✅ Attendance [${action}]: ${employeeName} at ${currentTime.toLocaleTimeString()}`);
    res.json({ success: true, message: `Attendance ${action} recorded` });
  } catch (err) {
    console.error("ATTENDANCE TRACK ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/status/:employeeId", async (req, res) => {
  try {
    const pool = await poolPromise;
    const { employeeId } = req.params;
    
    const hash = crypto.createHash("md5").update(employeeId).digest("hex");
    const formattedUUID = [
      hash.substring(0, 8),
      hash.substring(8, 12),
      hash.substring(12, 16),
      hash.substring(16, 20),
      hash.substring(20, 32),
    ].join("-");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await pool.request()
      .input("EmployeeId", formattedUUID)
      .input("TodayDate", today)
      .query(`
        SELECT TOP 1 *
        FROM DailyAttendance
        WHERE DeliveryPersonId = @EmployeeId 
        AND CAST(CreatedOn AS DATE) = CAST(@TodayDate AS DATE)
        ORDER BY CreatedOn DESC
      `);
      
    res.json(result.recordset[0] || null);
  } catch (err) {
    console.error("ATTENDANCE STATUS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
