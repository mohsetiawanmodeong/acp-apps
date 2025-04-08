-- Versi WAWAN
USE [gbc_mrcapps]
GO
/****** Object:  StoredProcedure [dbo].[mrcFMIACPMerge]    Script Date: 4/8/2025 1:01:44 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
ALTER PROCEDURE [dbo].[mrcFMIACPMerge]
@vmachine_name NVARCHAR (64), @vstart_time DATETIMEOFFSET (3), @vcategory NVARCHAR (64), @vtype NVARCHAR (64), @vmeasurement NVARCHAR (64), @vvalue NVARCHAR (256), @vUNIQUE_CONST NVARCHAR (128)
AS
BEGIN
    MERGE INTO FMIACP
    
    USING (VALUES (@vmachine_name, @vstart_time, @vcategory, @vtype, @vmeasurement, @vvalue)) AS I(machine_name, start_time, [category], [type], [measurement], [value]) ON (FMIACP.[UNIQUE_CONST] = @vUNIQUE_CONST)
    WHEN MATCHED AND (I.machine_name <> @vmachine_name
                      OR I.[category] <> @vcategory
                      OR I.[measurement] <> @vmeasurement
                      OR I.[value] <> @vvalue) THEN UPDATE 
    SET machine_name  = @vmachine_name,
        [category]    = @vcategory,
        [measurement] = @vmeasurement,
        [value]       = @vvalue,
        LAST_UPDATE   = SYSDATETIMEOFFSET()
    /*WHEN NOT MATCHED THEN INSERT (machine_name, start_time, [category], [type], [measurement], [value], LAST_UPDATE) VALUES (@vmachine_name, @vstart_time, @vcategory, @vtype, @vmeasurement, @vvalue, SYSDATETIMEOFFSET());*/
	WHEN NOT MATCHED THEN INSERT (machine_name, start_time, [category], [type], [measurement], [value], [UNIQUE_CONST], LAST_UPDATE) VALUES (@vmachine_name, @vstart_time, @vcategory, @vtype, @vmeasurement, @vvalue, @vUNIQUE_CONST, SYSDATETIMEOFFSET());
END



-- Versi Mark Chambers
USE [gbc_mrcapps]
GO
/****** Object:  StoredProcedure [dbo].[mrcFMIACPMerge]    Script Date: 4/8/2025 1:07:23 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO








ALTER PROCEDURE [dbo].[mrcFMIACPMerge](
@vmachine_name as nvarchar(64), @vstart_time as datetimeoffset(3), @vcategory as nvarchar(64), @vtype as nvarchar(64), @vmeasurement as nvarchar(64), @vvalue as nvarchar(64),
@vUNIQUE_CONST as nvarchar(128))
AS
BEGIN
MERGE INTO FMIACP USING ( VALUES (@vmachine_name, @vstart_time, @vcategory, @vtype, @vmeasurement, @vvalue)) I 
(machine_name, start_time, [category], [type], [measurement], [value])
ON (FMIACP.[UNIQUE_CONST]= @vUNIQUE_CONST) 
WHEN MATCHED AND (I.machine_name <> @vmachine_name OR I.[category] <> @vcategory OR I.[measurement] <> @vmeasurement OR I.[value] <> @vvalue) THEN
UPDATE SET machine_name=@vmachine_name, [category]=@vcategory,[measurement]=@vmeasurement,[value]=@vvalue, LAST_UPDATE=SYSDATETIMEOFFSET()
WHEN NOT MATCHED THEN INSERT ( machine_name, start_time, [category], [type], [measurement], [value],LAST_UPDATE ) 
VALUES (@vmachine_name, @vstart_time, @vcategory, @vtype, @vmeasurement, @vvalue, SYSDATETIMEOFFSET());
END;
