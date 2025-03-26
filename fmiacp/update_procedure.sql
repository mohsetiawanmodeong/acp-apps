USE [gbc_mrcapps]
GO

-- Drop the existing stored procedure if it exists
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[mrcFMIACPMerge]') AND type in (N'P'))
DROP PROCEDURE [dbo].[mrcFMIACPMerge]
GO

-- Create the updated stored procedure with UNIQUE_CONST field
CREATE PROCEDURE [dbo].[mrcFMIACPMerge]
@vmachine_name NVARCHAR(64), 
@vstart_time DATETIMEOFFSET(3), 
@vcategory NVARCHAR(64), 
@vtype NVARCHAR(64), 
@vmeasurement NVARCHAR(64), 
@vvalue NVARCHAR(256), 
@vUNIQUE_CONST NVARCHAR(128)
AS
BEGIN
    MERGE INTO FMIACP
    USING (VALUES (@vmachine_name, @vstart_time, @vcategory, @vtype, @vmeasurement, @vvalue, @vUNIQUE_CONST)) 
    AS I(machine_name, start_time, [category], [type], [measurement], [value], [UNIQUE_CONST]) 
    ON (FMIACP.[UNIQUE_CONST] = @vUNIQUE_CONST)
    
    WHEN MATCHED AND (
        I.machine_name <> @vmachine_name OR 
        I.[category] <> @vcategory OR 
        I.[measurement] <> @vmeasurement OR 
        I.[value] <> @vvalue
    ) THEN 
        UPDATE SET 
            machine_name = @vmachine_name,
            [category] = @vcategory,
            [measurement] = @vmeasurement,
            [value] = @vvalue,
            LAST_UPDATE = SYSDATETIMEOFFSET()
    
    WHEN NOT MATCHED THEN 
        INSERT (
            machine_name, 
            start_time, 
            [category], 
            [type], 
            [measurement], 
            [value], 
            [UNIQUE_CONST],
            LAST_UPDATE
        ) 
        VALUES (
            @vmachine_name, 
            @vstart_time, 
            @vcategory, 
            @vtype, 
            @vmeasurement, 
            @vvalue, 
            @vUNIQUE_CONST,
            SYSDATETIMEOFFSET()
        );
END
GO