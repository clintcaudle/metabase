Readme.txt

File updated:
LeafletMarkerPinMap.jsx

New file:
CarinaIcons.jsx

Updated file location:
/metabase/frontend/src/metabase/visualizations/components/

Icon location:
I created a carina directory for the images. Change to your liking. Don't forget to update the image paths in the CarinaIcons.jsx

/metabase/resources/frontend_client/app/assets/img/carina


Table columns:
Tables need to have 3 columns to display icons like the table example below:
lat, lon, and icon_type.


CREATE TABLE IF NOT EXISTS public.locations
(
    id bigint,
    ... other columns omitted
    lat numeric,
    lon numeric,
    icon_type smallint DEFAULT 0
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.locations
    OWNER to postgres;
