/**
 * SAMPLE XML PROVIDER FOR XML COMPARING
 * =====================================
 * Provides verified baseline OLD XML and updated NEW XML for immediate testing
 * and demonstration in the XML Comparing tab.
 */

export const SAMPLE_OLD_XML = `<?xml version="1.0" encoding="UTF-8" ?>
<exchange xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://download.autodesk.com/us/navisworks/schemas/nw-exchange-12.0.xsd" units="m" filename="Project_Coordination_v1.xml" filepath="">
  <batchtest name="Highway_Clash_Batch" internal_name="Highway_Clash_Batch" units="m">
    <clashtests>
      <!-- Test 1: Will be MODIFIED in new XML (Type Hard -> Clearance, Tolerance 0.4000000000 -> 0.5000000000) -->
      <clashtest name="HW0010_v_HW0020" test_type="hard" status="new" tolerance="0.4000000000" merge_composites="0">
        <linkage mode="none"/>
        <left>
          <clashselection selfintersect="0" primtypes="1">
            <locator>lcop_selection_set_tree/Highways/A-HW0010</locator>
          </clashselection>
        </left>
        <right>
          <clashselection selfintersect="0" primtypes="1">
            <locator>lcop_selection_set_tree/Highways/A-HW0020</locator>
          </clashselection>
        </right>
        <rules/>
      </clashtest>
      <!-- Test 2: Will be UNCHANGED in new XML -->
      <clashtest name="HW0010_v_ST0510" test_type="hard" status="new" tolerance="0.2500000000" merge_composites="0">
        <linkage mode="none"/>
        <left>
          <clashselection selfintersect="0" primtypes="1">
            <locator>lcop_selection_set_tree/Highways/A-HW0010</locator>
          </clashselection>
        </left>
        <right>
          <clashselection selfintersect="0" primtypes="1">
            <locator>lcop_selection_set_tree/Structures/A-ST0510</locator>
          </clashselection>
        </right>
        <rules/>
      </clashtest>
      <!-- Test 3: Will be REMOVED in new XML (deprecated scope) -->
      <clashtest name="HW0010_v_OLD999" test_type="clearance" status="new" tolerance="0.1000000000" merge_composites="0">
        <linkage mode="none"/>
        <left>
          <clashselection selfintersect="0" primtypes="1">
            <locator>lcop_selection_set_tree/Highways/A-HW0010</locator>
          </clashselection>
        </left>
        <right>
          <clashselection selfintersect="0" primtypes="1">
            <locator>lcop_selection_set_tree/Legacy/OLD999</locator>
          </clashselection>
        </right>
        <rules/>
      </clashtest>
      <!-- Test 4: Another UNCHANGED test -->
      <clashtest name="HW0020_v_ST0510" test_type="clearance" status="new" tolerance="0.3000000000" merge_composites="0">
        <linkage mode="none"/>
        <left>
          <clashselection selfintersect="0" primtypes="1">
            <locator>lcop_selection_set_tree/Highways/A-HW0020</locator>
          </clashselection>
        </left>
        <right>
          <clashselection selfintersect="0" primtypes="1">
            <locator>lcop_selection_set_tree/Structures/A-ST0510</locator>
          </clashselection>
        </right>
        <rules/>
      </clashtest>
    </clashtests>
    <selectionsets>
      <viewfolder name="Highways" guid="11111111-2222-3333-4444-555555555555">
        <selectionset name="A-HW0010" guid="aaaa1111-0000-0000-0000-000000000001">
          <findspec mode="all" disjoint="0">
            <conditions>
              <condition test="equals" flags="74">
                <category>
                  <name internal="LcRevitData_Element">Element</name>
                </category>
                <property>
                  <name internal="LcRevitProperty_Category">Category</name>
                </property>
                <value>
                  <data type="wstring">Roads</data>
                </value>
              </condition>
            </conditions>
            <locator>/</locator>
          </findspec>
        </selectionset>
        <selectionset name="A-HW0020" guid="aaaa1111-0000-0000-0000-000000000002">
          <findspec mode="all" disjoint="0">
            <conditions>
              <condition test="equals" flags="74">
                <category>
                  <name internal="LcRevitData_Element">Element</name>
                </category>
                <property>
                  <name internal="LcRevitProperty_Category">Category</name>
                </property>
                <value>
                  <data type="wstring">Bridges</data>
                </value>
              </condition>
            </conditions>
            <locator>/</locator>
          </findspec>
        </selectionset>
      </viewfolder>
      <viewfolder name="Structures" guid="22222222-3333-4444-5555-666666666666">
        <selectionset name="A-ST0510" guid="bbbb2222-0000-0000-0000-000000000001">
          <findspec mode="all" disjoint="0">
            <conditions>
              <condition test="contains" flags="74">
                <category>
                  <name internal="LcRevitData_Custom">Custom</name>
                </category>
                <property>
                  <name internal="CD_Priority">CD_Priority</name>
                </property>
                <value>
                  <data type="wstring">High</data>
                </value>
              </condition>
            </conditions>
            <locator>/</locator>
          </findspec>
        </selectionset>
      </viewfolder>
      <viewfolder name="Legacy" guid="99999999-0000-0000-0000-000000000000">
        <selectionset name="OLD999" guid="ffff9999-0000-0000-0000-000000000001">
          <findspec mode="all" disjoint="0">
            <conditions>
              <condition test="equals" flags="10">
                <category>
                  <name internal="LcOaNode">Item</name>
                </category>
                <property>
                  <name internal="LcOaNodeSelectedItems">Name</name>
                </property>
                <value>
                  <data type="wstring">Temporary</data>
                </value>
              </condition>
            </conditions>
            <locator>/</locator>
          </findspec>
        </selectionset>
      </viewfolder>
    </selectionsets>
  </batchtest>
</exchange>`;

export const SAMPLE_NEW_XML = `<?xml version="1.0" encoding="UTF-8" ?>
<exchange xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://download.autodesk.com/us/navisworks/schemas/nw-exchange-12.0.xsd" units="m" filename="Project_Coordination_v2_Updated.xml" filepath="">
  <batchtest name="Highway_Clash_Batch_v2" internal_name="Highway_Clash_Batch_v2" units="m">
    <clashtests>
      <!-- Test 1: MODIFIED (Type Hard -> Clearance, Tolerance 0.4000000000 -> 0.5000000000) -->
      <clashtest name="HW0010_v_HW0020" test_type="clearance" status="active" tolerance="0.5000000000" merge_composites="0">
        <linkage mode="none"/>
        <left>
          <clashselection selfintersect="0" primtypes="1">
            <locator>lcop_selection_set_tree/Highways/A-HW0010</locator>
          </clashselection>
        </left>
        <right>
          <clashselection selfintersect="0" primtypes="1">
            <locator>lcop_selection_set_tree/Highways/A-HW0020</locator>
          </clashselection>
        </right>
        <rules/>
      </clashtest>
      <!-- Test 2: UNCHANGED -->
      <clashtest name="HW0010_v_ST0510" test_type="hard" status="new" tolerance="0.2500000000" merge_composites="0">
        <linkage mode="none"/>
        <left>
          <clashselection selfintersect="0" primtypes="1">
            <locator>lcop_selection_set_tree/Highways/A-HW0010</locator>
          </clashselection>
        </left>
        <right>
          <clashselection selfintersect="0" primtypes="1">
            <locator>lcop_selection_set_tree/Structures/A-ST0510</locator>
          </clashselection>
        </right>
        <rules/>
      </clashtest>
      <!-- Test 4: UNCHANGED -->
      <clashtest name="HW0020_v_ST0510" test_type="clearance" status="new" tolerance="0.3000000000" merge_composites="0">
        <linkage mode="none"/>
        <left>
          <clashselection selfintersect="0" primtypes="1">
            <locator>lcop_selection_set_tree/Highways/A-HW0020</locator>
          </clashselection>
        </left>
        <right>
          <clashselection selfintersect="0" primtypes="1">
            <locator>lcop_selection_set_tree/Structures/A-ST0510</locator>
          </clashselection>
        </right>
        <rules/>
      </clashtest>
      <!-- Test 5: NEW Clash Test (introduced in revision 2) -->
      <clashtest name="HW0020_v_DR0100" test_type="hard" status="new" tolerance="0.1500000000" merge_composites="0">
        <linkage mode="none"/>
        <left>
          <clashselection selfintersect="0" primtypes="1">
            <locator>lcop_selection_set_tree/Highways/A-HW0020</locator>
          </clashselection>
        </left>
        <right>
          <clashselection selfintersect="0" primtypes="1">
            <locator>lcop_selection_set_tree/Drainage/A-DR0100</locator>
          </clashselection>
        </right>
        <rules/>
      </clashtest>
    </clashtests>
    <selectionsets>
      <viewfolder name="Highways" guid="11111111-2222-3333-4444-555555555555">
        <!-- A-HW0010: Same logical condition, regenerated GUID (Demonstrates GUID change != logical modification) -->
        <selectionset name="A-HW0010" guid="cccc9999-re-generated-guid-00000001">
          <findspec mode="all" disjoint="0">
            <conditions>
              <condition test="equals" flags="74">
                <category>
                  <name internal="LcRevitData_Element">Element</name>
                </category>
                <property>
                  <name internal="LcRevitProperty_Category">Category</name>
                </property>
                <value>
                  <data type="wstring">Roads</data>
                </value>
              </condition>
            </conditions>
            <locator>/</locator>
          </findspec>
        </selectionset>
        <selectionset name="A-HW0020" guid="aaaa1111-0000-0000-0000-000000000002">
          <findspec mode="all" disjoint="0">
            <conditions>
              <condition test="equals" flags="74">
                <category>
                  <name internal="LcRevitData_Element">Element</name>
                </category>
                <property>
                  <name internal="LcRevitProperty_Category">Category</name>
                </property>
                <value>
                  <data type="wstring">Bridges</data>
                </value>
              </condition>
            </conditions>
            <locator>/</locator>
          </findspec>
        </selectionset>
      </viewfolder>
      <viewfolder name="Structures" guid="22222222-3333-4444-5555-666666666666">
        <selectionset name="A-ST0510" guid="bbbb2222-0000-0000-0000-000000000001">
          <findspec mode="all" disjoint="0">
            <conditions>
              <condition test="contains" flags="74">
                <category>
                  <name internal="LcRevitData_Custom">Custom</name>
                </category>
                <property>
                  <name internal="CD_Priority">CD_Priority</name>
                </property>
                <value>
                  <data type="wstring">High</data>
                </value>
              </condition>
            </conditions>
            <locator>/</locator>
          </findspec>
        </selectionset>
      </viewfolder>
      <!-- Drainage folder with NEW selection set A-DR0100 -->
      <viewfolder name="Drainage" guid="33333333-4444-5555-6666-777777777777">
        <selectionset name="A-DR0100" guid="dddd3333-0000-0000-0000-000000000001">
          <findspec mode="all" disjoint="0">
            <conditions>
              <condition test="equals" flags="74">
                <category>
                  <name internal="LcRevitData_Element">Element</name>
                </category>
                <property>
                  <name internal="LcRevitProperty_Category">Category</name>
                </property>
                <value>
                  <data type="wstring">Drainage Pipes</data>
                </value>
              </condition>
            </conditions>
            <locator>/</locator>
          </findspec>
        </selectionset>
      </viewfolder>
    </selectionsets>
  </batchtest>
</exchange>`;
