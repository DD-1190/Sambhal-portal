-- North India demo for the demo account: city step + sample listings. Run after 003_listing_city.sql.
do $$
declare aid uuid;
begin
  select id into aid from accounts where is_demo order by created_at limit 1;
  if aid is null then raise exception 'No demo account found'; end if;
  update accounts set name = 'Sambhal Demo Realty', city = 'Delhi NCR and North India' where id = aid;
  insert into account_config (account_id, config) values (aid, '{"greeting": "Namaste! 🙏 Main {name} ka WhatsApp assistant hoon. Delhi NCR se Dehradun tak, flat ya plot, main turant options bhejta hoon aur site visit book kar deta hoon. Aap kya dhundh rahe hain?", "cities": [{"id": "delhi", "title": "Delhi", "areas": ["Dwarka", "Rohini", "Saket", "Laxmi Nagar"]}, {"id": "noida", "title": "Noida", "areas": ["Sector 150", "Sector 75", "Noida Extension"]}, {"id": "gurugram", "title": "Gurugram", "areas": ["Golf Course Ext Road", "Sohna Road", "Dwarka Expressway"]}, {"id": "ghaziabad", "title": "Ghaziabad", "areas": ["Indirapuram", "Raj Nagar Extension", "Vaishali"]}, {"id": "faridabad", "title": "Faridabad", "areas": ["Sector 81", "Greater Faridabad"]}, {"id": "lucknow", "title": "Lucknow", "areas": ["Gomti Nagar", "Sushant Golf City", "Jankipuram"]}, {"id": "jaipur", "title": "Jaipur", "areas": ["Vaishali Nagar", "Mansarovar", "Jagatpura"]}, {"id": "tricity", "title": "Chandigarh Tricity", "areas": ["Mohali", "Zirakpur", "Panchkula"]}, {"id": "dehradun", "title": "Dehradun", "areas": ["Sahastradhara Road", "Rajpur Road"]}]}'::jsonb)
    on conflict (account_id) do update set config = excluded.config;
  delete from listings where account_id = aid and external_id is null;
  insert into listings (account_id, kind, city, area, price_lakh, title, details) values
  (aid, 'flat', 'Delhi', 'Dwarka', 145, '3 BHK DDA flat, 1,450 sq ft', 'Sector 12, near metro, ready to move'),
  (aid, 'flat', 'Delhi', 'Rohini', 78, '2 BHK builder floor, 900 sq ft', 'Sector 24, 2nd floor, parking'),
  (aid, 'flat', 'Delhi', 'Laxmi Nagar', 46, '2 BHK flat, 650 sq ft', 'Near metro, family society'),
  (aid, 'flat', 'Delhi', 'Saket', 320, '3 BHK builder floor, 1,800 sq ft', 'Lift, 2 parkings, park facing'),
  (aid, 'plot', 'Delhi', 'Rohini', 185, '100 sq yd plot', 'Sector 28, freehold, corner'),
  (aid, 'plot', 'Delhi', 'Dwarka', 95, '60 sq yd plot', 'Dwarka Mor side, registry ready'),
  (aid, 'flat', 'Noida', 'Sector 150', 165, '3 BHK, 1,750 sq ft', 'Sports city, high floor, ready to move'),
  (aid, 'flat', 'Noida', 'Noida Extension', 48, '2 BHK, 1,050 sq ft', 'Gaur City, possession 2027'),
  (aid, 'flat', 'Noida', 'Sector 75', 88, '3 BHK, 1,350 sq ft', 'Near metro, gated society'),
  (aid, 'plot', 'Noida', 'Noida Extension', 42, '100 sq yd plot', 'YEIDA side, authority approved'),
  (aid, 'plot', 'Noida', 'Sector 150', 120, '200 sq yd plot', 'Corner plot, 30 m road'),
  (aid, 'flat', 'Gurugram', 'Golf Course Ext Road', 240, '3 BHK, 2,050 sq ft', 'Luxury tower, ready to move'),
  (aid, 'flat', 'Gurugram', 'Sohna Road', 92, '2 BHK, 1,250 sq ft', 'Gated society, club house'),
  (aid, 'flat', 'Gurugram', 'Dwarka Expressway', 48, '2 BHK affordable, 650 sq ft', 'Haryana affordable scheme'),
  (aid, 'plot', 'Gurugram', 'Sohna Road', 95, '150 sq yd plot', 'DTCP approved township'),
  (aid, 'plot', 'Gurugram', 'Dwarka Expressway', 210, '250 sq yd plot', 'Sector 106, freehold'),
  (aid, 'flat', 'Ghaziabad', 'Raj Nagar Extension', 46, '2 BHK, 980 sq ft', 'Corner unit, 3rd floor'),
  (aid, 'flat', 'Ghaziabad', 'Indirapuram', 62, '2 BHK, 1,180 sq ft', 'Gated society, 9th floor'),
  (aid, 'flat', 'Ghaziabad', 'Indirapuram', 125, '3 BHK, 1,650 sq ft', 'Ready to move, park facing'),
  (aid, 'flat', 'Ghaziabad', 'Vaishali', 41, '2 BHK, 900 sq ft', 'Near metro, 2nd floor'),
  (aid, 'plot', 'Ghaziabad', 'Raj Nagar Extension', 55, '150 sq yd plot', 'East facing, 30 ft road'),
  (aid, 'plot', 'Ghaziabad', 'Indirapuram', 140, '200 sq yd plot', 'Nyay Khand, corner'),
  (aid, 'flat', 'Faridabad', 'Sector 81', 58, '3 BHK, 1,400 sq ft', 'Near Faridabad-Gurugram road'),
  (aid, 'flat', 'Faridabad', 'Greater Faridabad', 38, '2 BHK, 950 sq ft', 'New tower, possession 2027'),
  (aid, 'flat', 'Faridabad', 'Sector 81', 105, '4 BHK, 2,100 sq ft', 'Premium society'),
  (aid, 'plot', 'Faridabad', 'Greater Faridabad', 45, '120 sq yd plot', 'Gated township'),
  (aid, 'plot', 'Faridabad', 'Sector 81', 90, '200 sq yd plot', 'HSVP sector'),
  (aid, 'flat', 'Lucknow', 'Gomti Nagar', 82, '3 BHK, 1,600 sq ft', 'Gomti Nagar Extension, river view'),
  (aid, 'flat', 'Lucknow', 'Jankipuram', 36, '2 BHK, 1,000 sq ft', 'Ready to move, near ring road'),
  (aid, 'flat', 'Lucknow', 'Sushant Golf City', 120, '4 BHK villa floor, 2,400 sq ft', 'Golf view, gated'),
  (aid, 'plot', 'Lucknow', 'Sushant Golf City', 48, '1,000 sq ft plot', 'LDA approved'),
  (aid, 'plot', 'Lucknow', 'Gomti Nagar', 110, '2,400 sq ft plot', 'Vibhuti Khand side'),
  (aid, 'flat', 'Jaipur', 'Jagatpura', 42, '2 BHK, 1,050 sq ft', 'Near ring road, gated'),
  (aid, 'flat', 'Jaipur', 'Vaishali Nagar', 78, '3 BHK, 1,500 sq ft', 'Prime location, ready to move'),
  (aid, 'flat', 'Jaipur', 'Mansarovar', 115, '4 BHK, 2,200 sq ft', 'Corner apartment, park facing'),
  (aid, 'plot', 'Jaipur', 'Jagatpura', 35, '150 sq yd plot', 'JDA approved'),
  (aid, 'plot', 'Jaipur', 'Mansarovar', 95, '250 sq yd plot', 'Main road, freehold'),
  (aid, 'flat', 'Chandigarh Tricity', 'Zirakpur', 48, '2 BHK, 1,100 sq ft', 'VIP Road, ready to move'),
  (aid, 'flat', 'Chandigarh Tricity', 'Mohali', 95, '3 BHK, 1,750 sq ft', 'Airport Road, gated'),
  (aid, 'flat', 'Chandigarh Tricity', 'Panchkula', 160, '3 BHK independent floor, 1,900 sq ft', 'Sector 20, premium'),
  (aid, 'plot', 'Chandigarh Tricity', 'Mohali', 130, '250 sq yd plot', 'GMADA approved, Sector 82'),
  (aid, 'plot', 'Chandigarh Tricity', 'Zirakpur', 45, '100 sq yd plot', 'Gated colony'),
  (aid, 'flat', 'Dehradun', 'Sahastradhara Road', 58, '2 BHK, 1,150 sq ft', 'Hill view, gated'),
  (aid, 'flat', 'Dehradun', 'Rajpur Road', 135, '3 BHK, 1,900 sq ft', 'Mussoorie view, premium'),
  (aid, 'flat', 'Dehradun', 'Sahastradhara Road', 44, '1 BHK studio, 650 sq ft', 'Ideal for second home'),
  (aid, 'plot', 'Dehradun', 'Sahastradhara Road', 38, '200 sq yd plot', 'MDDA approved'),
  (aid, 'plot', 'Dehradun', 'Rajpur Road', 105, '300 sq yd plot', 'Valley view');
end $$;
